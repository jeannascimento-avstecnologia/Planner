import { redirect } from "next/navigation";
import Link from "next/link";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { TeamsIntegrationForm } from "@/components/plan/teams-integration-form";
import { createClient } from "@/lib/supabase/server";

export default async function TeamsIntegrationPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const supabase = await createClient();
  const { data: integration } = await supabase
    .from("org_teams_integrations")
    .select("team_id, channel_id, planner_plan_id, planner_bucket_id, azure_tenant_id")
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  return (
    <div className="space-y-4" data-testid="teams-integration-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Microsoft Teams</h2>
        <p className="text-sm text-aurora-muted">
          Configure o destino Planner para exportacao a partir de{" "}
          <Link href="/plan" className="text-aurora-brand hover:underline">
            Meu plano
          </Link>
          .
        </p>
      </div>
      <TeamsIntegrationForm
        orgId={ctx.orgId}
        initial={{
          teamId: integration?.team_id ?? "",
          channelId: integration?.channel_id ?? "",
          planId: integration?.planner_plan_id ?? "",
          bucketId: integration?.planner_bucket_id ?? "",
          tenantId: integration?.azure_tenant_id ?? "",
        }}
      />
    </div>
  );
}
