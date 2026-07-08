import { NextRequest, NextResponse } from "next/server";
import { auditLogFilterInput, auditEventType, type AuditEventType } from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { auditRowsToCsv, buildAuditPdfBuffer, fetchAllAuditRows } from "@/lib/audit/export-audit";

function parseEventTypes(type: string | null, types: string[]): AuditEventType[] | undefined {
  const merged = [...types];
  if (type) merged.push(type);
  const unique = [...new Set(merged.filter(Boolean))];
  if (!unique.length) return undefined;
  const parsed = unique.filter((t): t is AuditEventType => auditEventType.safeParse(t).success);
  return parsed.length ? parsed : undefined;
}

function toIsoDatetime(local: string | null): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const orgId = sp.get("orgId");
  const format = sp.get("format") ?? "csv";
  const type = sp.get("type");
  const types = sp.getAll("types");

  if (!orgId) {
    return NextResponse.json({ error: "orgId obrigatorio" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const filterParsed = auditLogFilterInput.safeParse({
    orgId,
    actorId: sp.get("actor") || undefined,
    eventTypes: parseEventTypes(type, types),
    from: toIsoDatetime(sp.get("from")),
    to: toIsoDatetime(sp.get("to")),
    limit: 100,
  });
  if (!filterParsed.success) {
    return NextResponse.json({ error: "Filtros invalidos" }, { status: 400 });
  }

  const fetched = await fetchAllAuditRows({
    orgId: filterParsed.data.orgId,
    actorId: filterParsed.data.actorId,
    eventTypes: filterParsed.data.eventTypes,
    from: filterParsed.data.from,
    to: filterParsed.data.to,
  });
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const buffer = await buildAuditPdfBuffer(fetched.rows);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="auditoria-${stamp}.pdf"`,
      },
    });
  }

  const csv = auditRowsToCsv(fetched.rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${stamp}.csv"`,
    },
  });
}
