import { redirect } from "next/navigation";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { SlackIntegrationForm } from "@/components/settings/slack-integration-form";
import { tryCreateServiceClient } from "@/lib/supabase/service";

export default async function SlackIntegrationPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings/organization");

  let configured = false;
  let channelLabel: string | null = null;
  const service = tryCreateServiceClient();
  if (service) {
    const { data } = await service.rpc("get_org_slack_webhook", { p_org: ctx.orgId });
    configured = Boolean(data?.length);
    channelLabel = (data?.[0]?.channel_label as string | null) ?? null;
  }

  return (
    <div className="space-y-4" data-testid="slack-integration-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Slack</h2>
        <p className="text-sm text-aurora-muted">Configure o Incoming Webhook para notificacoes e automacoes.</p>
      </div>
      <SlackIntegrationForm orgId={ctx.orgId} configured={configured} channelLabel={channelLabel} />
    </div>
  );
}
