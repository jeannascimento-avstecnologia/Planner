import { notFound, redirect } from "next/navigation";
import { AgentEditorPanel } from "@/components/settings/agent-editor-panel";
import { getAgentById } from "@/lib/agents-mock";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

type Props = {
  params: Promise<{ agentId: string }>;
};

export default async function SettingsAgentDetailPage({ params }: Props) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const { agentId } = await params;
  const agent = getAgentById(agentId);
  if (!agent) notFound();

  return <AgentEditorPanel agent={agent} />;
}
