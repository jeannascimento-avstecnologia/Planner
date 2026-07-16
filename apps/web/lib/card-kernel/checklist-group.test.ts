import { describe, expect, it } from "vitest";
import {
  createChecklistItemInput,
  deleteChecklistItemInput,
  reorderChecklistItemInput,
  toggleChecklistItemInput,
} from "@nextgen/contracts";
import { groupChecklistItemsByCard } from "./checklist-group";
import { sanitizeName } from "@/lib/sanitize";

describe("groupChecklistItemsByCard", () => {
  it("agrupa por card_id preservando ordem", () => {
    const map = groupChecklistItemsByCard([
      { id: "1", card_id: "a", title: "A1", done: false, position: "a0" },
      { id: "2", card_id: "b", title: "B1", done: true, position: "a0" },
      { id: "3", card_id: "a", title: "A2", done: true, position: "a1" },
    ]);
    expect(map.get("a")).toEqual([
      { id: "1", title: "A1", done: false, position: "a0" },
      { id: "3", title: "A2", done: true, position: "a1" },
    ]);
    expect(map.get("b")).toHaveLength(1);
  });

  it("retorna mapa vazio para input vazio", () => {
    expect(groupChecklistItemsByCard([]).size).toBe(0);
  });
});

describe("checklist Zod + sanitize", () => {
  it("aceita create valido e rejeita titulo vazio", () => {
    expect(
      createChecklistItemInput.safeParse({
        cardId: "11111111-1111-1111-1111-111111111111",
        title: "Briefing",
      }).success,
    ).toBe(true);
    expect(
      createChecklistItemInput.safeParse({
        cardId: "11111111-1111-1111-1111-111111111111",
        title: "",
      }).success,
    ).toBe(false);
  });

  it("toggle / reorder / delete schemas", () => {
    expect(
      toggleChecklistItemInput.safeParse({
        itemId: "11111111-1111-1111-1111-111111111111",
        done: true,
      }).success,
    ).toBe(true);
    expect(
      reorderChecklistItemInput.safeParse({
        itemId: "11111111-1111-1111-1111-111111111111",
        position: "a1",
      }).success,
    ).toBe(true);
    expect(
      deleteChecklistItemInput.safeParse({
        itemId: "11111111-1111-1111-1111-111111111111",
      }).success,
    ).toBe(true);
  });

  it("sanitize remove tags HTML do titulo", () => {
    expect(sanitizeName("<b>ok</b>", 200)).toBe("ok");
  });
});
