import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { CARD_PERMISSION_FIELDS } from "@nextgen/contracts";

export default async function PermissionsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings/organization");

  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("field_permission_rules")
    .select("id, role, field_name, access")
    .eq("org_id", ctx.orgId)
    .order("role")
    .order("field_name");

  const roles = ["viewer", "manager", "admin", "owner"] as const;

  return (
    <div className="space-y-4" data-testid="permissions-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Permissoes por campo</h2>
        <p className="text-sm text-aurora-muted">Controle leitura/escrita de campos de card por papel.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-aurora-surface-2 text-xs uppercase text-aurora-muted">
            <tr>
              <th className="px-3 py-2">Campo</th>
              {roles.map((r) => (
                <th key={r} className="px-3 py-2 capitalize">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CARD_PERMISSION_FIELDS.map((field) => (
              <tr key={field} className="border-t border-aurora-border">
                <td className="px-3 py-2 font-mono text-xs">{field}</td>
                {roles.map((role) => {
                  const rule = (rules ?? []).find((x) => x.role === role && x.field_name === field);
                  return (
                    <td key={role} className="px-3 py-2 text-aurora-muted">
                      {rule?.access ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
