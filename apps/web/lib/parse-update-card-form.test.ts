import { describe, expect, it } from "vitest";
import { parseUpdateCardFormData } from "./parse-update-card-form";

function fd(entries: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return form;
}

const ids = {
  cardId: "11111111-1111-1111-1111-111111111111",
  boardId: "22222222-2222-2222-2222-222222222222",
};

describe("parseUpdateCardFormData", () => {
  it("aceita horas com virgula e pontos", () => {
    const parsed = parseUpdateCardFormData(
      fd({ ...ids, title: "Card", estimatedHours: "8,5", storyPoints: "3" }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.estimatedHours).toBe(8.5);
    expect(parsed.data.storyPoints).toBe(3);
  });

  it("rejeita horas invalidas", () => {
    const parsed = parseUpdateCardFormData(fd({ ...ids, title: "Card", estimatedHours: "1e3" }));
    expect(parsed.ok).toBe(false);
  });
});
