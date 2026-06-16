"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "../auth-actions";
import { inputClass, btnPrimary, linkClass } from "@/lib/ui-classes";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button type="submit" disabled={pending} className={`w-full ${btnPrimary}`}>
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <div className={`flex items-center justify-between text-sm text-aurora-muted`}>
        <Link href="/forgot-password" className={linkClass}>
          Esqueci a senha
        </Link>
        <Link href="/signup" className={linkClass}>
          Criar conta
        </Link>
      </div>
    </form>
  );
}
