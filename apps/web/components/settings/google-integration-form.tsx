"use client";

import { useTransition } from "react";
import {
  exportDeadlinesToGoogleAction,
  getGoogleOAuthUrlAction,
  saveGoogleIntegrationAction,
} from "@/app/(app)/settings/integrations/actions";
import { appToast } from "@/lib/toast";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";

type Props = {
  orgId: string;
  calendarId?: string | null;
  userConnected: boolean;
};

export function GoogleIntegrationForm({ orgId, calendarId, userConnected }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveGoogleIntegrationAction({
        orgId,
        calendarId: String(fd.get("calendarId") ?? ""),
      });
      if (!result.ok) appToast.error(result.error);
      else appToast.success("Calendario Google salvo.");
    });
  }

  function handleConnectGoogle() {
    startTransition(async () => {
      const result = await getGoogleOAuthUrlAction();
      if ("error" in result) {
        appToast.error(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  function handleExport() {
    startTransition(async () => {
      const result = await exportDeadlinesToGoogleAction(orgId);
      if (!result.ok) appToast.error(result.error);
      else appToast.success(`${result.exported} prazos exportados.`);
    });
  }

  return (
    <div className="space-y-4" data-testid="google-integration-form">
      <p className="text-sm text-aurora-muted">Export one-way de prazos (`due_date`) para Google Calendar.</p>
      <p className="text-sm" data-testid="google-user-connection">
        Conta Google: {userConnected ? "conectada" : "nao conectada"}
      </p>
      <button type="button" onClick={handleConnectGoogle} disabled={pending} className={btnBoardPrimarySm}>
        Conectar Google
      </button>
      <form onSubmit={handleSave} className="max-w-lg space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-aurora-muted">Calendar ID</label>
          <input name="calendarId" required defaultValue={calendarId ?? "primary"} className={inputBoardClassSm} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={btnBoardPrimarySm}>
            Salvar calendario
          </button>
          <button type="button" disabled={pending || !userConnected} onClick={handleExport} className={btnBoardPrimarySm}>
            Exportar prazos
          </button>
        </div>
      </form>
    </div>
  );
}
