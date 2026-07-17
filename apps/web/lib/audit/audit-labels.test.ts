import { describe, expect, it } from "vitest";
import { auditEventType } from "@nextgen/contracts";
import { auditPayloadSummary } from "./audit-labels";
import { collectAuditLookupIds, mergeAuditDisplayNames } from "./enrich-audit-payloads";
import type { AuditLogRow } from "@nextgen/contracts";

describe("auditPayloadSummary", () => {
  it("org_logo_updated — adicionada", () => {
    expect(auditPayloadSummary("org_logo_updated", { has_logo: true })).toBe("Logo adicionada");
  });

  it("org_logo_updated — removida", () => {
    expect(auditPayloadSummary("org_logo_updated", { has_logo: false })).toBe("Logo removida");
  });

  it("role_changed — pessoa + papeis em portugues", () => {
    expect(
      auditPayloadSummary("role_changed", {
        user_name: "Ana Silva",
        old_role: "viewer",
        new_role: "manager",
      }),
    ).toBe("Ana Silva: Visualizador → Gerente");
  });

  it("card_updated — titulo + campos legiveis", () => {
    expect(
      auditPayloadSummary("card_updated", {
        title: "Entrega Q3",
        changed_fields: ["title", "due_date"],
      }),
    ).toBe('Card "Entrega Q3" — Campos: Titulo, Prazo final');
  });

  it("board_renamed", () => {
    expect(auditPayloadSummary("board_renamed", { old_name: "A", new_name: "B" })).toBe("A → B");
  });

  it("preset_created — nome do preset", () => {
    expect(auditPayloadSummary("preset_created", { name: "Leitura + comentar" })).toBe(
      'Criou preset "Leitura + comentar"',
    );
  });

  it("preset_deleted — usa name mesmo apos exclusao", () => {
    expect(
      auditPayloadSummary("preset_deleted", {
        preset_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        name: "Custom Ops",
      }),
    ).toBe('Excluiu preset "Custom Ops"');
  });

  it("preset_assigned — acesso + pessoa + projeto", () => {
    expect(
      auditPayloadSummary("preset_assigned", {
        preset_name: "Editor",
        user_name: "Bruno Costa",
        board_name: "Roadmap",
      }),
    ).toBe('Concedeu acesso "Editor" a Bruno Costa no projeto "Roadmap"');
  });

  it("board_member_added — pessoa + acesso + projeto", () => {
    expect(
      auditPayloadSummary("board_member_added", {
        user_name: "Carla",
        preset_name: "Visualizador",
        board_name: "Marketing",
      }),
    ).toBe('Adicionou Carla com acesso "Visualizador" no projeto "Marketing"');
  });

  it("member_invited — pessoa + papel org", () => {
    expect(
      auditPayloadSummary("member_invited", { user_name: "Diego", role: "viewer" }),
    ).toBe("Adicionou Diego com papel Visualizador");
  });

  it("card_moved — titulo + colunas", () => {
    expect(
      auditPayloadSummary("card_moved", {
        title: "Bug login",
        from_column_name: "Todo",
        to_column_name: "Doing",
      }),
    ).toBe('Card "Bug login" de "Todo" para "Doing"');
  });

  it("card_assigned — nomes de responsaveis", () => {
    expect(
      auditPayloadSummary("card_assigned", {
        title: "API",
        old_assignee_id: "1",
        new_assignee_id: "2",
        old_assignee_name: "Ana",
        new_assignee_name: "Bruno",
      }),
    ).toBe('Card "API": Ana → Bruno');
  });

  it("cobre todos os tipos sem JSON cru no default", () => {
    for (const t of auditEventType.options) {
      const sample: Record<string, unknown> =
        t === "org_logo_updated"
          ? { has_logo: true }
          : t === "card_created"
            ? { title: "Teste" }
            : t === "role_changed"
              ? { old_role: "viewer", new_role: "admin", user_name: "X" }
              : t === "board_renamed"
                ? { old_name: "X", new_name: "Y" }
                : t.startsWith("preset_")
                  ? { name: "P", preset_name: "P", user_name: "U" }
                  : {};
      const out = auditPayloadSummary(t, sample);
      expect(out).not.toMatch(/^\{/);
      expect(out.length).toBeGreaterThan(0);
    }
  });
});

describe("mergeAuditDisplayNames", () => {
  it("preenche nomes a partir dos maps sem sobrescrever", () => {
    const row: Pick<AuditLogRow, "board_id" | "card_id"> = {
      board_id: "b1",
      card_id: "c1",
    };
    const merged = mergeAuditDisplayNames(
      {
        user_id: "u1",
        preset_id: "p1",
        from_column_id: "col1",
        to_column_id: "col2",
        user_name: "Ja tinha",
      },
      {
        users: { u1: "Novo Nome" },
        presets: { p1: "Editor" },
        columns: { col1: "A", col2: "B" },
        boards: { b1: "Projeto X" },
        cards: { c1: "Card Y" },
      },
      row,
    );
    expect(merged.user_name).toBe("Ja tinha");
    expect(merged.preset_name).toBe("Editor");
    expect(merged.from_column_name).toBe("A");
    expect(merged.to_column_name).toBe("B");
    expect(merged.board_name).toBe("Projeto X");
    expect(merged.title).toBe("Card Y");
  });

  it("collectAuditLookupIds agrega ids dos payloads", () => {
    const ids = collectAuditLookupIds([
      {
        id: 1,
        org_id: "o",
        board_id: "b1",
        card_id: "c1",
        actor_id: null,
        event_scope: "card",
        event_type: "card_moved",
        payload: {
          user_id: "u1",
          preset_id: "p1",
          from_column_id: "col1",
          to_column_id: "col2",
        },
        occurred_at: "2026-07-17T00:00:00.000Z",
        actor_name: null,
        actor_avatar: null,
      },
    ]);
    expect(ids.userIds).toEqual(["u1"]);
    expect(ids.presetIds).toEqual(["p1"]);
    expect(ids.columnIds.sort()).toEqual(["col1", "col2"]);
    expect(ids.boardIds).toEqual(["b1"]);
    expect(ids.cardIds).toEqual(["c1"]);
  });
});
