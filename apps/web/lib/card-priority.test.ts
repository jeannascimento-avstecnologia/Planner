import { describe, expect, it } from "vitest";
import { CARD_PRIORITY_LABELS, cardPriorityLabel } from "./card-priority";

describe("cardPriorityLabel", () => {
  it("mapeia valores persistidos para pt-BR", () => {
    expect(cardPriorityLabel("medium")).toBe("Média");
    expect(CARD_PRIORITY_LABELS.low).toBe("Baixa");
    expect(CARD_PRIORITY_LABELS.urgent).toBe("Urgente");
  });
});
