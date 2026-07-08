import { orgTeamsIntegrationConfigured, userMicrosoftConnected } from "@/lib/load-plan-grid";
import { PlanExportTeamsButton } from "@/components/plan/plan-export-teams-button";

type Props = { orgId: string };

export async function PlanExportSection({ orgId }: Props) {
  const [teamsConfigured, microsoftConnected] = await Promise.all([
    orgTeamsIntegrationConfigured(orgId),
    userMicrosoftConnected(),
  ]);

  return (
    <PlanExportTeamsButton
      orgId={orgId}
      teamsConfigured={teamsConfigured}
      microsoftConnected={microsoftConnected}
    />
  );
}
