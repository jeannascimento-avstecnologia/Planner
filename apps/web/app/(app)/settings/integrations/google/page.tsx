import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { GoogleIntegrationForm } from "@/components/settings/google-integration-form";

export default async function GoogleIntegrationPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("org_google_integrations")
    .select("calendar_id")
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  const { data: connected } = await supabase.rpc("user_has_google_connection");

  return (
    <div className="space-y-4" data-testid="google-integration-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Google Calendar</h2>
        <p className="text-sm text-aurora-muted">Conecte sua conta Google e escolha o calendario de destino.</p>
      </div>
      <GoogleIntegrationForm
        orgId={ctx.orgId}
        calendarId={config?.calendar_id ?? null}
        userConnected={Boolean(connected)}
      />
    </div>
  );
}
