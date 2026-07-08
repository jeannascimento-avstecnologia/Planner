import type { AuditLogRow } from "@nextgen/contracts";
import { auditEventLabel, auditPayloadSummary, redactAuditPayload } from "@/lib/audit/audit-labels";
import { loadAuditLog } from "@/lib/load-audit-log";
import type { AuditLogFilterInput } from "@nextgen/contracts";

const CSV_HEADERS = ["id", "occurred_at", "actor", "event_type", "event_label", "scope", "board_id", "card_id", "detail"] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function auditRowsToCsv(rows: AuditLogRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    const safePayload = redactAuditPayload(row.payload);
    const cells = [
      String(row.id),
      row.occurred_at,
      row.actor_name ?? "Sistema",
      row.event_type,
      auditEventLabel(row.event_type),
      row.event_scope,
      row.board_id ?? "",
      row.card_id ?? "",
      auditPayloadSummary(row.event_type, safePayload),
    ].map((c) => escapeCsvCell(c));
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

export async function fetchAllAuditRows(
  filter: Omit<AuditLogFilterInput, "limit" | "cursorOccurredAt" | "cursorId">,
  maxRows = 10_000,
): Promise<{ rows: AuditLogRow[] } | { error: string }> {
  const rows: AuditLogRow[] = [];
  let cursor: { occurredAt: string; id: number } | null = null;

  while (rows.length < maxRows) {
    const result = await loadAuditLog({
      ...filter,
      limit: 100,
      ...(cursor
        ? {
            cursorOccurredAt: new Date(cursor.occurredAt).toISOString(),
            cursorId: cursor.id,
          }
        : {}),
    });
    if ("error" in result) return result;
    rows.push(...result.rows);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return { rows: rows.slice(0, maxRows) };
}

export async function buildAuditPdfBuffer(rows: AuditLogRow[]): Promise<Buffer> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import("@react-pdf/renderer");
  const React = await import("react");

  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
    title: { fontSize: 14, marginBottom: 12, fontFamily: "Helvetica-Bold" },
    headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 4, marginBottom: 4, fontFamily: "Helvetica-Bold" },
    row: { flexDirection: "row", marginBottom: 3 },
    colWhen: { width: "18%" },
    colActor: { width: "14%" },
    colEvent: { width: "18%" },
    colDetail: { width: "50%" },
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Relatorio de auditoria"),
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(Text, { style: styles.colWhen }, "Quando"),
        React.createElement(Text, { style: styles.colActor }, "Ator"),
        React.createElement(Text, { style: styles.colEvent }, "Evento"),
        React.createElement(Text, { style: styles.colDetail }, "Detalhe"),
      ),
      ...rows.map((row) =>
        React.createElement(
          View,
          { key: row.id, style: styles.row },
          React.createElement(Text, { style: styles.colWhen }, new Date(row.occurred_at).toLocaleString("pt-BR")),
          React.createElement(Text, { style: styles.colActor }, row.actor_name ?? "Sistema"),
          React.createElement(Text, { style: styles.colEvent }, auditEventLabel(row.event_type)),
          React.createElement(
            Text,
            { style: styles.colDetail },
            auditPayloadSummary(row.event_type, redactAuditPayload(row.payload)),
          ),
        ),
      ),
    ),
  );

  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
