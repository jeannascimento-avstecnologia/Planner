"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrgMultiOwnerAction } from "@/app/(app)/settings/organization/actions";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  enabled: boolean;
  isOwner: boolean;
};

export function MultiOwnerToggle({ orgId, enabled, isOwner }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(enabled);

  if (!isOwner) return null;

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await setOrgMultiOwnerAction({ orgId, enabled: next });
      if (!res.ok) {
        setOn(!next);
        appToast.error(res.error);
        return;
      }
      appToast.success(next ? "Multiplos proprietarios ativado" : "Multiplos proprietarios desativado");
      router.refresh();
    });
  }

  return (
    <section
      className="space-y-2 rounded-xl border border-aurora-border bg-aurora-surface p-4"
      data-testid="multi-owner-toggle-section"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-aurora-fg">Multiplos proprietarios</h3>
          <p className="mt-1 text-sm text-aurora-muted">
            Com a chave ativa, voce pode promover ou convidar mais de uma pessoa como proprietario, com as mesmas
            permissoes.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={() => toggle(!on)}
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            on ? "justify-end bg-aurora-accent" : "justify-start bg-aurora-border"
          } disabled:opacity-60`}
          data-testid="multi-owner-toggle"
        >
          <span className="pointer-events-none h-6 w-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>
      {on ? (
        <p className="text-xs text-aurora-accent">Ativo — use Membros ou Convites para adicionar proprietarios.</p>
      ) : (
        <p className="text-xs text-aurora-muted">Desativado — apenas um proprietario (use transferencia abaixo).</p>
      )}
    </section>
  );
}
