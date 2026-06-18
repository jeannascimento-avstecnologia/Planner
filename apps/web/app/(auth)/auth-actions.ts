"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInInput, signUpInput, forgotPasswordInput } from "@nextgen/contracts";

export type AuthState = { error?: string; message?: string };

function authConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || anon.includes("<")) {
    return "Supabase nao configurado. Inicie o Docker, rode `supabase start` na raiz e execute `npm run supabase:env` para gerar apps/web/.env.local.";
  }
  return null;
}

function mapAuthNetworkError(message: string): string {
  if (message === "fetch failed") {
    return "Supabase local nao esta rodando. Inicie o Docker Desktop, execute `supabase start` na raiz do projeto e reinicie o `npm run dev`.";
  }
  return message;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return (base || "org") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email ou senha invalidos." };

  const configError = authConfigError();
  if (configError) return { error: configError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapAuthNetworkError(error.message) };
  redirect("/boards");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) {
    return { error: "Preencha todos os campos (senha com 8+ caracteres)." };
  }

  const configError = authConfigError();
  if (configError) return { error: configError };

  const supabase = await createClient();
  let target: string;
  // redirect() lanca NEXT_REDIRECT; por isso fica FORA do try/catch (senao o
  // catch engole o throw e a navegacao nunca acontece).
  try {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName } },
    });
    if (error) return { error: mapAuthNetworkError(error.message) };

    if (data.session) {
      const { error: orgError } = await supabase.rpc("create_organization", {
        p_name: parsed.data.orgName,
        p_slug: slugify(parsed.data.orgName),
      });
      if (orgError) return { error: orgError.message };
      target = "/boards";
    } else {
      target = "/login?message=confirm";
    }
  } catch (err) {
    const cause =
      err instanceof Error && "cause" in err
        ? (err as Error & { cause?: { code?: string } }).cause
        : null;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : null;
    if (code === "ECONNREFUSED") {
      return {
        error:
          "Supabase local nao esta rodando. Inicie o Docker Desktop, execute `supabase start` na raiz do projeto e reinicie o `npm run dev`.",
      };
    }
    return { error: err instanceof Error ? err.message : "Erro inesperado ao criar conta." };
  }

  redirect(target);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = forgotPasswordInput.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Email invalido." };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/boards`,
  });
  if (error) return { error: error.message };
  return { message: "Se o email existir, enviamos o link de redefinicao." };
}

export async function signInWithGoogle(): Promise<void> {
  const configError = authConfigError();
  if (configError) redirect(`/login?error=${encodeURIComponent(configError)}`);

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/boards`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect("/login?error=callback");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
