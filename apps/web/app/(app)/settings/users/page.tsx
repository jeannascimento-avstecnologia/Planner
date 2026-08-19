import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { redirect } from "next/navigation";

export default async function SettingsUsersPlaceholderPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  return (
    <section className="space-y-2" data-testid="settings-users-placeholder">
      <h2 className="text-lg font-semibold text-aurora-fg">Usuarios</h2>
      <p className="text-sm text-aurora-muted">Modulo em migracao.</p>
    </section>
  );
}
