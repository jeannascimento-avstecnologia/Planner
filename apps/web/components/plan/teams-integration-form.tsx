"use client";

import { useTransition } from "react";
import { saveTeamsIntegrationAction } from "@/app/(app)/plan/actions";
import { appToast } from "@/lib/toast";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";

type Props = {
  orgId: string;
  initial?: {
    teamId: string;
    channelId: string;
    planId: string;
    bucketId: string;
    tenantId: string | null;
  } | null;
};

export function TeamsIntegrationForm({ orgId, initial }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveTeamsIntegrationAction({
        orgId,
        teamId: String(fd.get("teamId") ?? ""),
        channelId: String(fd.get("channelId") ?? ""),
        planId: String(fd.get("planId") ?? ""),
        bucketId: String(fd.get("bucketId") ?? ""),
        tenantId: String(fd.get("tenantId") ?? "") || undefined,
      });
      if (!result.ok) appToast.error(result.error);
      else appToast.success("Integracao Teams salva.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4" data-testid="teams-integration-form">
      <p className="text-sm text-aurora-muted">
        IDs do Teams/Planner (obtenha no Graph Explorer ou URL do plano no navegador). Export one-way para o canal
        configurado.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted">Azure Tenant ID (opcional)</label>
        <input name="tenantId" defaultValue={initial?.tenantId ?? ""} className={inputBoardClassSm} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted">Team ID</label>
        <input name="teamId" required defaultValue={initial?.teamId ?? ""} className={inputBoardClassSm} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted">Channel ID</label>
        <input name="channelId" required defaultValue={initial?.channelId ?? ""} className={inputBoardClassSm} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted">Planner Plan ID</label>
        <input name="planId" required defaultValue={initial?.planId ?? ""} className={inputBoardClassSm} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted">Planner Bucket ID</label>
        <input name="bucketId" required defaultValue={initial?.bucketId ?? ""} className={inputBoardClassSm} />
      </div>
      <button type="submit" disabled={pending} className={btnBoardPrimarySm}>
        {pending ? "Salvando…" : "Salvar integracao"}
      </button>
    </form>
  );
}
