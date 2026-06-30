"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "../auth-actions";
import { authInputClass, btnPrimary, authLinkClass } from "@/lib/ui-classes";

const initialState: AuthState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="mb-4 text-sm text-aurora-muted">
        Informe seu email e enviaremos um link para redefinir a senha.
      </p>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={authInputClass} />
      </div>

      {state.error ? <p className="text-sm text-red-600 font-bold">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-600 font-bold">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
        {pending ? "Enviando..." : "Enviar link"}
      </button>

      <p className="mt-4 text-center text-sm text-aurora-muted">
        <Link href="/login" className={authLinkClass}>
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
