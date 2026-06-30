"use client";

import type { BoardCard } from "./types";
import { TifluxTicketBadges } from "./tiflux-ticket-badges";

type Props = {
  card: Pick<BoardCard, "id" | "tiflux_ticket_number">;
  tifluxEnabled: boolean;
  readOnly?: boolean;
  onOpenTifluxCreate: (cardId: string) => void;
  onOpenTifluxLink: (cardId: string) => void;
  compact?: boolean;
};

export function TifluxCardButton({
  card,
  tifluxEnabled,
  readOnly = false,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  compact = false,
}: Props) {
  if (!tifluxEnabled) return null;

  if (card.tiflux_ticket_number) {
    return <TifluxTicketBadges ticketNumber={card.tiflux_ticket_number} compact={compact} />;
  }

  if (readOnly) return null;

  const btnClass = `inline-flex shrink-0 items-center rounded bg-aurora-accent font-medium text-white hover:opacity-90 ${
    compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs"
  }`;

  return (
    <span className="inline-flex shrink-0 gap-0.5">
      <button
        type="button"
        data-testid="tiflux-card-create"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenTifluxCreate(card.id);
        }}
        className={btnClass}
      >
        Criar
      </button>
      <button
        type="button"
        data-testid="tiflux-card-link"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenTifluxLink(card.id);
        }}
        className={btnClass}
      >
        Associar
      </button>
    </span>
  );
}
