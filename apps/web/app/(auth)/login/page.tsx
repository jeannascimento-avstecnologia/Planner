"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signInInput } from "@nextgen/contracts";
import { AuthQueryAlert } from "@/components/auth/auth-query-alert";
import { AuthOAuthDivider, OAuthSignInButtons } from "@/components/auth/oauth-sign-in-buttons";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { normalizeAuthEmail } from "@/lib/normalize-auth-email";
import { authInputClass, btnPrimary, authLinkClass } from "@/lib/ui-classes";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { isMicrosoftLoginAvailable } from "@/lib/supabase/is-local-url";
import { createClient } from "@/lib/supabase/client";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed": "Confirme seu email antes de entrar.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const msAvailable = isMicrosoftLoginAvailable();
    const queryError = searchParams.get("error");
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c84914" },
      body: JSON.stringify({
        sessionId: "c84914",
        runId: "pre-fix",
        hypothesisId: "A,B,C",
        location: "login/page.tsx:LoginForm",
        message: "login mount auth env",
        data: {
          supabaseHost: supabaseUrl ? new URL(supabaseUrl).hostname : null,
          microsoftAvailable: msAvailable,
          hasQueryError: Boolean(queryError),
          queryErrorPrefix: queryError ? queryError.slice(0, 40) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const parsed = signInInput.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      rememberMe,
    });
    if (!parsed.success) {
      setError("Email ou senha invalidos.");
      setPending(false);
      return;
    }

    try {
      const supabase = createClient({ sessionOnly: !rememberMe });
      const loginEmail = normalizeAuthEmail(parsed.data.email);
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();

      if (existingUser && normalizeAuthEmail(existingUser.email ?? "") !== loginEmail) {
        await supabase.auth.signOut();
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: parsed.data.password,
      });
      if (authError) {
        setError(AUTH_ERROR_MESSAGES[authError.message] ?? "Nao foi possivel entrar. Tente novamente.");
        return;
      }

      const persistenceResponse = await fetch("/api/auth/persistence", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rememberMe }),
      });
      if (!persistenceResponse.ok) {
        await supabase.auth.signOut();
        setError("Nao foi possivel salvar a sessao. Tente novamente.");
        return;
      }

      window.location.assign(next || "/boards");
    } catch {
      setError("Servico de autenticacao indisponivel.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <OAuthSignInButtons next={next} />
      {!isMicrosoftLoginAvailable() ? (
        <p className="text-center text-xs text-aurora-muted" data-testid="microsoft-login-unavailable-hint">
          Login Microsoft requer Supabase Cloud. Rode <code className="font-mono">npm run dev:cloud</code> ou use
          admin@nextgen.dev.
        </p>
      ) : null}
      {process.env.NEXT_PUBLIC_SSO_ENABLED === "true" ? (
        <p className="text-center text-xs text-aurora-muted" data-testid="sso-hint">
          SSO empresarial disponivel — use o email corporativo no Google ou contate o admin.
        </p>
      ) : null}
      <AuthOAuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={authInputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={authInputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-aurora-border/80 bg-aurora-surface-2/50 px-3 py-2.5">
          <label htmlFor="rememberMe" className="cursor-pointer select-none text-sm font-medium text-aurora-fg">
            Lembre-me
          </label>
          <ToggleSwitch
            id="rememberMe"
            name="rememberMe"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
            aria-label="Lembre-me neste dispositivo"
            testId="login-remember-me"
          />
        </div>

        <Suspense fallback={null}>
          <AuthQueryAlert />
        </Suspense>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <div className="flex items-center justify-between text-sm text-aurora-muted">
          <Link href="/forgot-password" className={authLinkClass}>
            Esqueci a senha
          </Link>
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className={authLinkClass}>
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
