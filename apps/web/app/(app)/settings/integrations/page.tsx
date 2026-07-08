import { redirect } from "next/navigation";
import { IntegrationsHubCards } from "@/components/settings/integrations-hub-cards";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function IntegrationsHubPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  return <IntegrationsHubCards />;
}
