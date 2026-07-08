"use client";

import { useTransition } from "react";
import { exportPlanToTeamsAction, getMicrosoftOAuthUrlAction } from "@/app/(app)/plan/actions";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  teamsConfigured: boolean;
  microsoftConnected: boolean;
};

export function PlanExportTeamsButton({ orgId, teamsConfigured, microsoftConnected }: Props) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportPlanToTeamsAction(orgId);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(`${result.exported} card(s) exportado(s) para o Teams Planner.`);
    });
  }

  function handleConnect() {
    startTransition(async () => {
      const result = await getMicrosoftOAuthUrlAction();
      if ("error" in result) {
        appToast.error(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  if (!teamsConfigured) {
    return (
      <p className="text-xs text-aurora-muted" data-testid="plan-export-disabled">
        Export Teams: configure em{" "}
        <a href="/settings/integrations/teams" className="text-violet-600 underline dark:text-violet-300">
          Integracoes
        </a>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!microsoftConnected && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={pending}
          className="rounded-lg border border-aurora-border px-3 py-1.5 text-xs text-aurora-fg hover:bg-aurora-surface-2"
          data-testid="plan-connect-microsoft"
        >
          Conectar Microsoft
        </button>
      )}
      <button
        type="button"
        onClick={handleExport}
        disabled={pending || !microsoftConnected}
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        data-testid="plan-export-teams"
      >
        {pending ? "Exportando…" : "Exportar p/ Teams"}
      </button>
    </div>
  );
}
