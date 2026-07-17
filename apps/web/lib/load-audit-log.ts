import "server-only";

import { createClient } from "@/lib/supabase/server";
import { auditLogFilterInput, type AuditLogRow } from "@nextgen/contracts";
import { enrichAuditPayloads } from "@/lib/audit/enrich-audit-payloads";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export async function loadAuditLog(raw: unknown): Promise<{ rows: AuditLogRow[]; nextCursor: { occurredAt: string; id: number } | null } | { error: string }> {
  const parsed = auditLogFilterInput.safeParse(raw);
  if (!parsed.success) return { error: "Filtros invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", parsed.data.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) return { error: "Sem permissao." };

  let q = supabase
    .from("card_events")
    .select("id, org_id, board_id, card_id, actor_id, event_scope, event_type, payload, occurred_at")
    .eq("org_id", parsed.data.orgId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(parsed.data.limit + 1);

  if (parsed.data.actorId) q = q.eq("actor_id", parsed.data.actorId);
  if (parsed.data.eventTypes?.length) q = q.in("event_type", parsed.data.eventTypes);
  if (parsed.data.from) q = q.gte("occurred_at", parsed.data.from);
  if (parsed.data.to) q = q.lte("occurred_at", parsed.data.to);
  if (parsed.data.cursorOccurredAt && parsed.data.cursorId != null) {
    q = q.or(
      `occurred_at.lt.${parsed.data.cursorOccurredAt},and(occurred_at.eq.${parsed.data.cursorOccurredAt},id.lt.${parsed.data.cursorId})`,
    );
  }

  const { data, error } = await q;
  if (error) return { error: error.message };

  const slice = (data ?? []).slice(0, parsed.data.limit);
  const actorIds = [...new Set(slice.map((r) => r.actor_id).filter(Boolean))] as string[];
  let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
  if (actorIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", actorIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
  }

  const baseRows: AuditLogRow[] = slice.map((r) => ({
    id: r.id,
    org_id: r.org_id,
    board_id: r.board_id,
    card_id: r.card_id,
    actor_id: r.actor_id,
    event_scope: r.event_scope as AuditLogRow["event_scope"],
    event_type: r.event_type as AuditLogRow["event_type"],
    payload: (r.payload ?? {}) as Record<string, unknown>,
    occurred_at: r.occurred_at,
    actor_name: r.actor_id ? profiles[r.actor_id]?.full_name ?? null : null,
    actor_avatar: r.actor_id ? profiles[r.actor_id]?.avatar_url ?? null : null,
  }));

  const rows = await enrichAuditPayloads(supabase, baseRows);

  const hasMore = (data ?? []).length > parsed.data.limit;
  const last = rows.at(-1);
  const nextCursor =
    hasMore && last ? { occurredAt: last.occurred_at, id: last.id } : null;

  return { rows, nextCursor };
}

export function canViewAuditLog(role: string): boolean {
  return isOrgAdminRole(role);
}
