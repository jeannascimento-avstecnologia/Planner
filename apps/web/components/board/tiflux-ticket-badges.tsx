"use client";

type Props = {
  ticketNumber: string | null;
  compact?: boolean;
};

export function TifluxActiveTicketBadge({
  ticketNumber,
  compact = false,
}: {
  ticketNumber: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded bg-aurora-accent font-medium text-white ${
        compact ? "px-1 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      }`}
      title={`Chamado Tiflux #${ticketNumber}`}
      data-testid={`tiflux-active-${ticketNumber}`}
    >
      {compact ? `#${ticketNumber}` : `Chamado #${ticketNumber}`}
    </span>
  );
}

export function TifluxTicketBadges({ ticketNumber, compact = false }: Props) {
  if (!ticketNumber) return null;
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1">
      <TifluxActiveTicketBadge ticketNumber={ticketNumber} compact={compact} />
    </span>
  );
}
