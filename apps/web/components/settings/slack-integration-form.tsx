"use client";

import { useTransition } from "react";
import { saveSlackIntegrationAction, testSlackIntegrationAction } from "@/app/(app)/settings/integrations/actions";
import { appToast } from "@/lib/toast";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";

type Props = {
  orgId: string;
  configured: boolean;
  channelLabel?: string | null;
};

export function SlackIntegrationForm({ orgId, configured, channelLabel }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveSlackIntegrationAction({
        orgId,
        webhookUrl: String(fd.get("webhookUrl") ?? ""),
        channelLabel: String(fd.get("channelLabel") ?? "") || undefined,
      });
      if (!result.ok) appToast.error(result.error);
      else appToast.success("Webhook Slack salvo.");
    });
  }

  function handleTest() {
    startTransition(async () => {
      const result = await testSlackIntegrationAction(orgId);
      if (!result.ok) appToast.error(result.error);
      else appToast.success("Mensagem de teste enviada ao Slack.");
    });
  }

  return (
    <div className="space-y-4" data-testid="slack-integration-form">
      <p className="text-sm text-aurora-muted">
        Incoming Webhook do Slack (canal fixo). Reutilizado por automacoes `send_slack`.
      </p>
      {configured ? (
        <p className="text-sm text-aurora-success" data-testid="slack-configured-badge">
          Webhook configurado{channelLabel ? ` — ${channelLabel}` : ""}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="max-w-lg space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-aurora-muted">Webhook URL</label>
          <input
            name="webhookUrl"
            type="password"
            required={!configured}
            placeholder={configured ? "Informe novamente para substituir" : "https://hooks.slack.com/..."}
            className={inputBoardClassSm}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-aurora-muted">Rotulo do canal (opcional)</label>
          <input name="channelLabel" defaultValue={channelLabel ?? ""} className={inputBoardClassSm} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={btnBoardPrimarySm}>
            Salvar
          </button>
          <button type="button" disabled={pending || !configured} onClick={handleTest} className={btnBoardPrimarySm}>
            Testar conexao
          </button>
        </div>
      </form>
    </div>
  );
}
