import { redirect } from "next/navigation";
import { SettingsRouteChrome } from "@/components/settings/settings-route-chrome";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");

  return (
    <SettingsRouteChrome orgName={ctx.orgName} showAdminTabs={isOrgAdminRole(ctx.userRole)}>
      {children}
    </SettingsRouteChrome>
  );
}
