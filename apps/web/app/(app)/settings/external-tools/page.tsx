import { redirect } from "next/navigation";
import { ExternalToolsPanel } from "@/components/settings/external-tools-panel";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsExternalToolsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  return <ExternalToolsPanel />;
}
