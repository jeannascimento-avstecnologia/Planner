import { describe, expect, it } from "vitest";
import { cardInFlightLockKey, columnInFlightLockKey, normalizeBoardItemName } from "./board-item-names";

describe("board-item-names", () => {
  it("normaliza case e acentos", () => {
    expect(normalizeBoardItemName("  Tarefa A  ")).toBe("tarefa a");
    expect(normalizeBoardItemName("Coluna")).toBe(normalizeBoardItemName("coluna"));
  });

  it("gera lock keys estaveis por nome", () => {
    expect(cardInFlightLockKey("b1", "c1", "Teste")).toBe(cardInFlightLockKey("b1", "c1", "teste"));
    expect(columnInFlightLockKey("b1", "Backlog")).toBe(columnInFlightLockKey("b1", "backlog"));
  });
});
