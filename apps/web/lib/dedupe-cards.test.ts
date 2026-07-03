import { describe, expect, it } from "vitest";
import { dedupeCardsById } from "./dedupe-cards";

describe("dedupeCardsById", () => {
  it("remove duplicatas mantendo a primeira ocorrencia", () => {
    const rows = [
      { id: "a", title: "1" },
      { id: "b", title: "2" },
      { id: "a", title: "dup" },
    ];
    expect(dedupeCardsById(rows)).toEqual([
      { id: "a", title: "1" },
      { id: "b", title: "2" },
    ]);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(dedupeCardsById([])).toEqual([]);
  });
});
