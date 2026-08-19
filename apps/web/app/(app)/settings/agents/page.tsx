import { redirect } from "next/navigation";
import { AgentsListPanel } from "@/components/settings/agents-list-panel";
import { MOCK_AGENTS } from "@/lib/agents-mock";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsAgentsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  return <AgentsListPanel agents={MOCK_AGENTS} />;
}
