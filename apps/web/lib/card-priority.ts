import type { CardPriority } from "@nextgen/contracts";

export const CARD_PRIORITY_LABELS: Record<CardPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const CARD_PRIORITY_OPTIONS: CardPriority[] = ["low", "medium", "high", "urgent"];

export function cardPriorityLabel(priority: CardPriority): string {
  return CARD_PRIORITY_LABELS[priority];
}
