"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../auth-actions";
import { AuthQueryAlert } from "@/components/auth/auth-query-alert";
import { AuthOAuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { authInputClass, btnPrimary, authLinkClass } from "@/lib/ui-classes";
import { safeInternalPath } from "@/lib/safe-internal-path";

const initialState: AuthState = {};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "");
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="space-y-4">
      <GoogleSignInButton next={next} />
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
