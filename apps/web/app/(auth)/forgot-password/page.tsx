"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "../auth-actions";
import { inputClass, btnPrimary, linkClass } from "@/lib/ui-classes";

const initialState: AuthState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-base font-bold text-white mb-4">
        Informe seu email e enviaremos um link para redefinir a senha.
      </p>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-white">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>

      {state.error ? <p className="text-sm text-red-600 font-bold">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-600 font-bold">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
        {pending ? "Enviando..." : "Enviar link"}
      </button>

      <p className="text-center text-base font-bold text-white mt-4">
        <Link href="/login" className={linkClass}>
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
