export type TifluxCanceledTicket = {
  ticket_number: string;
  ticket_id: string | null;
  canceled_at?: string;
};

/** Legado: coluna `tiflux_canceled_tickets` no banco; UI nao exibe mais historico. */
export function parseTifluxCanceledTickets(raw: unknown): TifluxCanceledTicket[] {
  if (!Array.isArray(raw)) return [];
  const out: TifluxCanceledTicket[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticket_number = row.ticket_number;
    if (typeof ticket_number !== "string" && typeof ticket_number !== "number") continue;
    out.push({
      ticket_number: String(ticket_number),
      ticket_id: typeof row.ticket_id === "string" ? row.ticket_id : null,
      canceled_at: typeof row.canceled_at === "string" ? row.canceled_at : undefined,
    });
  }
  return out;
}
