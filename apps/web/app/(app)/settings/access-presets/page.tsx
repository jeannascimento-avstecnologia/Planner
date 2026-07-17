import { redirect } from "next/navigation";
import { AccessPresetsManager } from "@/components/settings/access-presets-manager";
import { listAccessPresets } from "@/lib/load-access-presets";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { canManageAccessPresets } from "@/lib/org-member-roles";

export default async function AccessPresetsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");

  const presets = await listAccessPresets(ctx.orgId);
  const canManage = canManageAccessPresets(ctx.userRole);

  return (
    <AccessPresetsManager orgId={ctx.orgId} presets={presets} canManage={canManage} />
  );
}
