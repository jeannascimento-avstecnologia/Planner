"use client";

import type { BoardCard } from "./types";

type Props = {
  card: Pick<BoardCard, "id" | "tiflux_ticket_number">;
  tifluxEnabled: boolean;
  onOpenTifluxCreate: (cardId: string) => void;
  onOpenTifluxLink: (cardId: string) => void;
  compact?: boolean;
};

export function TifluxCardButton({
  card,
  tifluxEnabled,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  compact = false,
}: Props) {
  if (!tifluxEnabled) return null;

  if (card.tiflux_ticket_number) {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded bg-aurora-accent font-medium text-white ${
          compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs"
        }`}
        title={`Chamado Tiflux #${card.tiflux_ticket_number}`}
      >
        #{card.tiflux_ticket_number}
      </span>
    );
  }

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
