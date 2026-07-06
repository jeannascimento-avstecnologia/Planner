import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { canManageOrgMembers } from "@/lib/org-member-roles";

export default async function WorkloadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/boards");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !canManageOrgMembers(membership.role)) redirect("/boards");

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekIso = weekStart.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("workload_by_member_week")
    .select("user_id, total_hours, total_points, card_count")
    .eq("org_id", orgId)
    .eq("week_start", weekIso);

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, weekly_capacity_hours").in("id", userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6" data-testid="workload-page">
      <header>
        <Link href="/boards" className="text-xs text-aurora-muted hover:text-aurora-fg">
          ← Projetos
        </Link>
        <h1 className="text-2xl font-semibold text-aurora-fg">Carga de trabalho</h1>
        <p className="text-sm text-aurora-muted">Semana iniciando em {weekIso}</p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-aurora-surface-2 text-xs uppercase text-aurora-muted">
            <tr>
              <th className="px-4 py-3">Membro</th>
              <th className="px-4 py-3">Horas</th>
              <th className="px-4 py-3">Capacidade</th>
              <th className="px-4 py-3">Utilizacao</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => {
              const p = profileMap[row.user_id];
              const cap = Number(p?.weekly_capacity_hours ?? 40);
              const hrs = Number(row.total_hours ?? 0);
              const pct = cap > 0 ? Math.round((hrs / cap) * 100) : 0;
              return (
                <tr key={row.user_id} className="border-t border-aurora-border" data-testid="workload-row">
                  <td className="px-4 py-3">{p?.full_name ?? row.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{hrs}h</td>
                  <td className="px-4 py-3">{cap}h</td>
                  <td className="px-4 py-3">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
