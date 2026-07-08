import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserPermissionsEditor } from "@/components/settings/user-permissions-editor";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { buildAccessMap } from "@/lib/field-permissions";
import { createClient } from "@/lib/supabase/server";
import type { CardPermissionField, FieldAccess } from "@nextgen/contracts";

type Props = {
  searchParams: Promise<{ user?: string }>;
};

export default async function PermissionsPage({ searchParams }: Props) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const sp = await searchParams;
  const supabase = await createClient();

  const members = ctx.members.map((m) => ({
    userId: m.user_id,
    name: m.full_name ?? m.user_id,
    role: m.role,
  }));

  const selectedUserId =
    members.find((m) => m.userId === sp.user)?.userId ?? members[0]?.userId ?? "";

  const selectedMember = members.find((m) => m.userId === selectedUserId);

  const { data: userOverridesRaw } = selectedUserId
    ? await supabase
        .from("user_field_permission_overrides")
        .select("field_name, access")
        .eq("org_id", ctx.orgId)
        .eq("user_id", selectedUserId)
        .eq("resource", "card")
    : { data: [] as { field_name: string; access: string }[] };

  const { data: roleRulesForRole } = selectedMember
    ? await supabase
        .from("field_permission_rules")
        .select("field_name, access")
        .eq("org_id", ctx.orgId)
        .eq("resource", "card")
        .eq("role", selectedMember.role)
    : { data: [] };

  const roleRules = buildAccessMap(roleRulesForRole ?? []) as Partial<
    Record<CardPermissionField, FieldAccess>
  >;
  const userOverrides = buildAccessMap(userOverridesRaw ?? []) as Partial<
    Record<CardPermissionField, FieldAccess>
  >;

  return (
    <div className="space-y-4" data-testid="permissions-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Permissoes personalizadas</h2>
        <p className="text-sm text-aurora-muted">
          Ajuste o acesso a campos dos cards por membro. Sobrescreve o padrao do papel quando definido.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-aurora-muted">Nenhum membro na organizacao.</p>
      ) : (
        <Suspense fallback={<p className="text-sm text-aurora-muted">Carregando...</p>}>
          <UserPermissionsEditor
            orgId={ctx.orgId}
            members={members}
            selectedUserId={selectedUserId}
            roleRules={roleRules}
            userOverrides={userOverrides}
          />
        </Suspense>
      )}
    </div>
  );
}
