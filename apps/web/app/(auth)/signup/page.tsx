"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "../auth-actions";
import { inputClass, btnPrimary, linkClass } from "@/lib/ui-classes";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="fullName" className="text-sm font-medium">
          Nome completo
        </label>
        <input id="fullName" name="fullName" type="text" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="orgName" className="text-sm font-medium">
          Nome da organizacao
        </label>
        <input id="orgName" name="orgName" type="text" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Senha (8+ caracteres)
        </label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className={inputClass} />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
        {pending ? "Criando..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-aurora-muted">
        Ja tem conta?{" "}
        <Link href="/login" className={linkClass}>
          Entrar
        </Link>
      </p>
    </form>
  );
}
