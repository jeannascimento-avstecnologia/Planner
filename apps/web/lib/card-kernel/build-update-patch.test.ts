import { describe, expect, it } from "vitest";
import { buildUpdateCardPatch } from "./build-update-patch";

const baseExisting = { start_date: "2026-07-01T12:00:00.000Z", due_date: "2026-07-10T12:00:00.000Z" };

describe("buildUpdateCardPatch", () => {
  it("mapeia campos camelCase para colunas DB", () => {
    const patch = buildUpdateCardPatch(
      {
        cardId: "11111111-1111-1111-1111-111111111111",
        boardId: "22222222-2222-2222-2222-222222222222",
        title: "Novo titulo",
        priority: "high",
        assigneeId: "33333333-3333-3333-3333-333333333333",
        estimatedHours: 4,
        description: "desc",
        targetDate: "2026-07-08T12:00:00.000Z",
      },
      baseExisting,
    );

    expect(patch).toEqual({
      title: "Novo titulo",
      priority: "high",
      assignee_id: "33333333-3333-3333-3333-333333333333",
      estimated_hours: 4,
      description: "desc",
      target_date: "2026-07-08T12:00:00.000Z",
    });
  });

  it("limpa datas com null", () => {
    const patch = buildUpdateCardPatch(
      {
        cardId: "11111111-1111-1111-1111-111111111111",
        boardId: "22222222-2222-2222-2222-222222222222",
        dueDate: null,
        startDate: null,
        targetDate: null,
        assigneeId: null,
      },
      baseExisting,
    );

    expect(patch.due_date).toBeNull();
    expect(patch.start_date).toBeNull();
    expect(patch.target_date).toBeNull();
    expect(patch.assignee_id).toBeNull();
  });

  it("infere start quando due muda e start existente fica inválido", () => {
    const patch = buildUpdateCardPatch(
      {
        cardId: "11111111-1111-1111-1111-111111111111",
        boardId: "22222222-2222-2222-2222-222222222222",
        dueDate: "2026-06-01T12:00:00.000Z",
      },
      { start_date: "2026-07-01T12:00:00.000Z", due_date: "2026-07-10T12:00:00.000Z" },
    );

    expect(patch.due_date).toBe("2026-06-01T12:00:00.000Z");
    expect(patch.start_date).toBe("2026-06-01T12:00:00.000Z");
  });

  it("retorna patch vazio quando nada muda", () => {
    const patch = buildUpdateCardPatch(
      {
        cardId: "11111111-1111-1111-1111-111111111111",
        boardId: "22222222-2222-2222-2222-222222222222",
      },
      baseExisting,
    );
    expect(patch).toEqual({});
  });
});
