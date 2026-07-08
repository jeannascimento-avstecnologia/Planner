import { redirect } from "next/navigation";
import { SettingsShell } from "@/components/settings/settings-shell";
import { loadSettingsShellData } from "@/lib/load-settings-shell";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const data = await loadSettingsShellData();
  if (!data) redirect("/login");

  return (
    <SettingsShell
      orgId={data.orgId}
      orgName={data.orgName}
      orgLogoUrl={data.orgLogoUrl}
      userFullName={data.userFullName}
      userEmail={data.userEmail}
      userRole={data.userRole}
      userOrgs={data.userOrgs}
      showAdminTabs={isOrgAdminRole(data.userRole)}
    >
      {children}
    </SettingsShell>
  );
}
