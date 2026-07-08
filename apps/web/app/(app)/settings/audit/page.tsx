import { redirect } from "next/navigation";
import { AuditLogTable } from "@/components/organization/audit-log-table";
import { AuditLogFilters, type AuditFilterValues } from "@/components/organization/audit-log-filters";
import { AuditExportButtons } from "@/components/organization/audit-export-buttons";
import { PAGE_COPY } from "@/lib/page-copy";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { canViewAuditLog, loadAuditLog } from "@/lib/load-audit-log";
import { auditEventType, type AuditEventType } from "@nextgen/contracts";

type Props = {
  searchParams: Promise<{
    cursor?: string;
    cursorId?: string;
    type?: string;
    types?: string | string[];
    actor?: string;
    from?: string;
    to?: string;
  }>;
};

function toIsoDatetime(local: string | undefined): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function parseEventTypes(type?: string, types?: string | string[]) {
  const merged = [...(Array.isArray(types) ? types : types ? [types] : [])];
  if (type) merged.push(type);
  const unique = [...new Set(merged.filter(Boolean))];
  if (!unique.length) return undefined;
  return unique.filter((t): t is AuditEventType => auditEventType.safeParse(t).success);
}

export default async function AuditLogPage({ searchParams }: Props) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!canViewAuditLog(ctx.userRole)) redirect("/settings/organization");

  const sp = await searchParams;
  const eventTypes = parseEventTypes(sp.type, sp.types);
  const filterValues: AuditFilterValues = {
    type: sp.type ?? "",
    types: Array.isArray(sp.types) ? sp.types : sp.types ? [sp.types] : [],
    actor: sp.actor ?? "",
    from: sp.from ?? "",
    to: sp.to ?? "",
  };

  const result = await loadAuditLog({
    orgId: ctx.orgId,
    actorId: sp.actor || undefined,
    eventTypes,
    from: toIsoDatetime(sp.from),
    to: toIsoDatetime(sp.to),
    cursorOccurredAt: sp.cursor ? new Date(sp.cursor).toISOString() : undefined,
    cursorId: sp.cursorId ? Number(sp.cursorId) : undefined,
    limit: 50,
  });

  if ("error" in result) {
    return <p className="text-sm text-red-500">{result.error}</p>;
  }

  const memberOptions = ctx.members.map((m) => ({
    userId: m.user_id,
    name: m.full_name ?? m.user_id,
  }));

  return (
    <div className="space-y-4" data-testid="audit-log-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Auditoria</h2>
          <p className="text-sm text-aurora-muted">{PAGE_COPY.audit.description}</p>
        </div>
        <AuditExportButtons orgId={ctx.orgId} filters={filterValues} />
      </div>
      <AuditLogFilters values={filterValues} members={memberOptions} />
      <AuditLogTable rows={result.rows} nextCursor={result.nextCursor} filterValues={filterValues} />
    </div>
  );
}
