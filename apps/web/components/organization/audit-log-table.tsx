"use client";

import Link from "next/link";
import type { AuditLogRow } from "@nextgen/contracts";
import { auditEventLabel, auditPayloadSummary } from "@/lib/audit/audit-labels";

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type Props = {
  rows: AuditLogRow[];
  nextCursor: { occurredAt: string; id: number } | null;
  orgId: string;
};

export function AuditLogTable({ rows, nextCursor, orgId }: Props) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-aurora-border bg-aurora-surface p-8 text-center text-sm text-aurora-muted" data-testid="audit-log-empty">
        Nenhum evento encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="audit-log-table">
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-aurora-border bg-aurora-surface-2 text-xs uppercase text-aurora-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium">Ator</th>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-aurora-surface-2/50" data-testid={`audit-row-${row.event_type}`}>
                <td className="whitespace-nowrap px-4 py-3 text-aurora-muted">{formatDt(row.occurred_at)}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-aurora-fg">{row.actor_name ?? "Sistema"}</span>
                </td>
                <td className="px-4 py-3">{auditEventLabel(row.event_type)}</td>
                <td className="max-w-xs truncate px-4 py-3 text-aurora-muted">
                  {row.board_id && (
                    <Link href={`/boards/${row.board_id}`} className="mr-2 text-aurora-accent hover:underline">
                      Projeto
                    </Link>
                  )}
                  {auditPayloadSummary(row.event_type, row.payload)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nextCursor && (
        <Link
          href={`/settings/audit?cursor=${nextCursor.occurredAt}&cursorId=${nextCursor.id}`}
          className="inline-block text-sm text-aurora-accent hover:underline"
          data-testid="audit-log-load-more"
        >
          Carregar mais
        </Link>
      )}
    </div>
  );
}
