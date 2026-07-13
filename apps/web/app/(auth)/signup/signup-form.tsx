"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "../auth-actions";
import { AuthOAuthDivider, OAuthSignInButtons } from "@/components/auth/oauth-sign-in-buttons";
import { authInputClass, btnPrimary, authLinkClass } from "@/lib/ui-classes";

const initialState: AuthState = {};

type Props = {
  next: string;
  inviteMode: boolean;
  invitedEmail: string | null;
  boardName: string | null;
};

export function SignupForm({ next, inviteMode, invitedEmail, boardName }: Props) {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="space-y-4">
      {!inviteMode ? (
        <>
          <OAuthSignInButtons next={next} />
          <AuthOAuthDivider />
        </>
      ) : (
        <p className="text-sm text-aurora-muted">
          Crie sua conta para entrar em <span className="font-medium text-aurora-fg">{boardName ?? "o projeto"}</span>.
          {invitedEmail ? (
            <>
              {" "}
              Use o email <span className="font-medium text-aurora-fg">{invitedEmail}</span>.
            </>
          ) : null}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-1">
          <label htmlFor="fullName" className="text-sm font-medium">
            Nome completo
          </label>
          <input id="fullName" name="fullName" type="text" required className={authInputClass} />
        </div>
        {!inviteMode ? (
          <div className="space-y-1">
            <label htmlFor="orgName" className="text-sm font-medium">
              Nome da organizacao
            </label>
            <input id="orgName" name="orgName" type="text" required className={authInputClass} />
          </div>
        ) : null}
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            readOnly={Boolean(invitedEmail)}
            defaultValue={invitedEmail ?? ""}
            className={`${authInputClass}${invitedEmail ? " opacity-90" : ""}`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha (8+ caracteres)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
          {pending ? "Criando..." : inviteMode ? "Criar conta e aceitar convite" : "Criar conta"}
        </button>

        <p className="text-center text-sm text-aurora-muted">
          Ja tem conta?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={authLinkClass}>
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
