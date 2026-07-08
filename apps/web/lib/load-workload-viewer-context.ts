import { createClient } from "@/lib/supabase/server";
import { orgRoleLabel } from "@/lib/org-member-roles";

export type WorkloadViewerContext = {
  orgName: string;
  orgRoleLabel: string;
  departmentNames: string[];
};

export async function loadWorkloadViewerContext(
  orgId: string,
  userId: string,
): Promise<WorkloadViewerContext | null> {
  const supabase = await createClient();

  const [{ data: org }, { data: membership }, { data: deptMembers }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("department_members").select("department_id").eq("org_id", orgId).eq("user_id", userId),
  ]);

  if (!org || !membership) return null;

  const deptIds = (deptMembers ?? []).map((m) => m.department_id);
  let departmentNames: string[] = [];
  if (deptIds.length) {
    const { data: depts } = await supabase.from("departments").select("name").in("id", deptIds).order("name");
    departmentNames = (depts ?? []).map((d) => d.name);
  }

  return {
    orgName: org.name,
    orgRoleLabel: orgRoleLabel(membership.role),
    departmentNames,
  };
}

export function formatWorkloadContextBadge(ctx: WorkloadViewerContext): string {
  const parts = [ctx.orgName, ctx.orgRoleLabel];
  if (ctx.departmentNames.length) {
    parts.push(`Dept. ${ctx.departmentNames.join(", ")}`);
  }
  return parts.join(" · ");
}
