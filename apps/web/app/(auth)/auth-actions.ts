"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AUTH_PERSIST_COOKIE } from "@/lib/supabase/auth-cookies";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { signUpInput, inviteSignUpInput, forgotPasswordInput, type SignUpInput } from "@nextgen/contracts";
import { isInviteAuthNext } from "@/lib/invite-auth";
import { normalizeAuthEmail } from "@/lib/normalize-auth-email";
import { safeInternalPath } from "@/lib/safe-internal-path";

export type AuthState = { error?: string; message?: string };

function authConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || anon.includes("<")) {
    if (process.env.NODE_ENV === "development") {
      return "Supabase nao configurado. Rode `npm run dev:local` na raiz do projeto.";
    }
    return "Servico de autenticacao indisponivel.";
  }
  return null;
}

/** Mensagens Supabase permitidas na UI (whitelist). Demais -> fallback generico (CWE-209). */
const AUTH_ERROR_WHITELIST: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed": "Confirme seu email antes de entrar.",
  "User already registered": "Este email ja esta cadastrado.",
};

function mapAuthNetworkError(message: string, fallback = "Nao foi possivel concluir. Tente novamente."): string {
  if (message === "fetch failed") {
    if (process.env.NODE_ENV === "development") {
      return "Supabase local indisponivel. Rode `npm run dev:local` na raiz (Docker Desktop ligado).";
    }
    return "Servico de autenticacao indisponivel.";
  }
  return AUTH_ERROR_WHITELIST[message] ?? fallback;
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

function safeAuthNext(raw: FormDataEntryValue | null): string {
  return safeInternalPath(typeof raw === "string" ? raw : null);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeAuthNext(formData.get("next"));
  const inviteSignup = isInviteAuthNext(next);

  const parsed = inviteSignup
    ? inviteSignUpInput.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        fullName: formData.get("fullName"),
      })
    : signUpInput.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        fullName: formData.get("fullName"),
        orgName: formData.get("orgName"),
      });
  if (!parsed.success) {
    return {
      error: inviteSignup
        ? "Preencha nome, email e senha (8+ caracteres)."
        : "Preencha todos os campos (senha com 8+ caracteres).",
    };
  }

  const configError = authConfigError();
  if (configError) return { error: configError };

  const supabase = await createClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();
  if (existingUser) {
    await supabase.auth.signOut();
  }

  const signupClient = await createClient();
  let target: string;
  try {
    const { data, error } = await signupClient.auth.signUp({
      email: normalizeAuthEmail(parsed.data.email),
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName } },
    });
    if (error) return { error: mapAuthNetworkError(error.message, "Nao foi possivel criar a conta.") };

    if (data.session) {
      if (!inviteSignup) {
        const orgName = (parsed.data as SignUpInput).orgName;
        const { error: orgError } = await signupClient.rpc("create_organization", {
          p_name: orgName,
          p_slug: slugify(orgName),
        });
        if (orgError) return { error: "Nao foi possivel criar a organizacao." };
      }
      target = inviteSignup ? next : safeAuthNext(formData.get("next"));
    } else {
      target = inviteSignup
        ? `/login?message=confirm&next=${encodeURIComponent(next)}`
        : "/login?message=confirm";
    }
  } catch (err) {
    const cause =
      err instanceof Error && "cause" in err
        ? (err as Error & { cause?: { code?: string } }).cause
        : null;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : null;
    if (code === "ECONNREFUSED") {
      return {
        error: mapAuthNetworkError("fetch failed"),
      };
    }
    return { error: "Erro inesperado ao criar conta." };
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
  const appUrl = getConfiguredAppUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/boards`,
  });
  if (error) return { error: "Nao foi possivel enviar o link. Tente novamente." };
  return { message: "Se o email existir, enviamos o link de redefinicao." };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const configError = authConfigError();
  if (configError) redirect(`/login?error=${encodeURIComponent(configError)}`);

  const next = safeAuthNext(formData.get("next"));
  const supabase = await createClient();
  const appUrl = getConfiguredAppUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect("/login?error=callback");
  redirect(data.url);
}

export async function signOut(formData: FormData): Promise<void> {
  const nextRaw = formData?.get("next");
  const loginNext = typeof nextRaw === "string" ? safeInternalPath(nextRaw, "/boards") : null;
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_PERSIST_COOKIE);
  redirect(loginNext ? `/login?next=${encodeURIComponent(loginNext)}` : "/login");
}

export async function signOutToPath(formData: FormData): Promise<void> {
  const next = safeAuthNext(formData.get("next"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_PERSIST_COOKIE);
  redirect(next);
}
