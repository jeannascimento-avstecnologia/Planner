"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../auth-actions";
import { AuthQueryAlert } from "@/components/auth/auth-query-alert";
import { AuthOAuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { authInputClass, btnPrimary, authLinkClass } from "@/lib/ui-classes";
import { safeInternalPath } from "@/lib/safe-internal-path";

const initialState: AuthState = {};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "");
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [rememberMe, setRememberMe] = useState(true);

  // #region agent log
  useEffect(() => {
    const log = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c84914" },
        body: JSON.stringify({
          sessionId: "c84914",
          runId: "pre-fix",
          hypothesisId,
          location: "login/page.tsx",
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };

    log("login page mounted", { href: window.location.href, next: next || null }, "H4");

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      log("unhandled rejection", { msg }, "H1,H2,H4");
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [next]);

  useEffect(() => {
    if (!state.redirectTo) return;
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c84914" },
      body: JSON.stringify({
        sessionId: "c84914",
        runId: "pre-fix",
        hypothesisId: "H2",
        location: "login/page.tsx:redirect",
        message: "client redirect after signIn",
        data: { redirectTo: state.redirectTo },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    router.replace(state.redirectTo);
    router.refresh();
  }, [state.redirectTo, router]);
  // #endregion

  return (
    <div className="space-y-4">
      <GoogleSignInButton next={next} />
      {process.env.NEXT_PUBLIC_SSO_ENABLED === "true" ? (
        <p className="text-center text-xs text-aurora-muted" data-testid="sso-hint">
          SSO empresarial disponivel — use o email corporativo no Google ou contate o admin.
        </p>
      ) : null}
      <AuthOAuthDivider />

      <form action={formAction} className="space-y-4">
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
          <input id="password" name="password" type="password" required autoComplete="current-password" className={authInputClass} />
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
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <div className={`flex items-center justify-between text-sm text-aurora-muted`}>
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
