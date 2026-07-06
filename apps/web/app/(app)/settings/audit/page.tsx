import { redirect } from "next/navigation";
import { AuditLogTable } from "@/components/organization/audit-log-table";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { canViewAuditLog, loadAuditLog } from "@/lib/load-audit-log";
import { orgAuditEventTypes } from "@nextgen/contracts";

type Props = {
  searchParams: Promise<{ cursor?: string; cursorId?: string; type?: string; actor?: string }>;
};

export default async function AuditLogPage({ searchParams }: Props) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!canViewAuditLog(ctx.userRole)) redirect("/settings/organization");

  const sp = await searchParams;
  const eventTypes = sp.type ? [sp.type] : undefined;

  const result = await loadAuditLog({
    orgId: ctx.orgId,
    actorId: sp.actor,
    eventTypes: eventTypes as typeof orgAuditEventTypes[number][] | undefined,
    cursorOccurredAt: sp.cursor,
    cursorId: sp.cursorId ? Number(sp.cursorId) : undefined,
    limit: 50,
  });

  if ("error" in result) {
    return <p className="text-sm text-red-500">{result.error}</p>;
  }

  return (
    <div className="space-y-4" data-testid="audit-log-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Auditoria</h2>
        <p className="text-sm text-aurora-muted">Historico imutavel de acoes na organizacao (400 dias).</p>
      </div>
      <form className="flex flex-wrap gap-3" method="get">
        <select name="type" defaultValue={sp.type ?? ""} className="rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {orgAuditEventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-aurora-accent px-4 py-2 text-sm font-medium text-white" data-testid="audit-filter-submit">
          Filtrar
        </button>
      </form>
      <AuditLogTable rows={result.rows} nextCursor={result.nextCursor} orgId={ctx.orgId} />
    </div>
  );
}
