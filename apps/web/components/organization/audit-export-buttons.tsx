"use client";

import { buildAuditFilterQuery, type AuditFilterValues } from "./audit-log-filters";

type Props = {
  orgId: string;
  filters: AuditFilterValues;
};

export function AuditExportButtons({ orgId, filters }: Props) {
  const qs = buildAuditFilterQuery(filters);
  const base = `/api/audit/export?orgId=${encodeURIComponent(orgId)}${qs ? `&${qs}` : ""}`;

  return (
    <div className="flex flex-wrap gap-2" data-testid="audit-export-buttons">
      <a
        href={`${base}&format=csv`}
        download
        className="rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm font-medium text-aurora-fg hover:bg-aurora-surface-2"
        data-testid="audit-export-csv"
      >
        Exportar CSV
      </a>
      <a
        href={`${base}&format=pdf`}
        download
        className="rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm font-medium text-aurora-fg hover:bg-aurora-surface-2"
        data-testid="audit-export-pdf"
      >
        Exportar PDF
      </a>
    </div>
  );
}
