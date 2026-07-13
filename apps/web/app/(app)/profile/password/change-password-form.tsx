"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePassword, type ChangePasswordResult } from "../actions";
import { inputClass, btnPrimary, linkClass } from "@/lib/ui-classes";

const initial: ChangePasswordResult = {};

type Props = {
  hasPasswordProvider: boolean;
  oauthProviderLabel?: string | null;
};

export function ChangePasswordForm({ hasPasswordProvider, oauthProviderLabel }: Props) {
  const [state, formAction, pending] = useActionState(changePassword, initial);

  if (!hasPasswordProvider) {
    const provider = oauthProviderLabel ?? "provedor social";
    return (
      <p className="text-base font-bold text-white mb-4">
        Sua conta usa login {provider}. Para alterar credenciais, gerencie na conta {provider}.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="currentPassword" className="text-sm font-medium text-white">
          Senha atual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="newPassword" className="text-sm font-medium text-white">
          Nova senha
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-aurora-success">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>

      <p className="text-center text-base font-bold text-white mt-4">
        <Link href="/profile" className={linkClass}>
          Voltar ao perfil
        </Link>
      </p>
    </form>
  );
}
