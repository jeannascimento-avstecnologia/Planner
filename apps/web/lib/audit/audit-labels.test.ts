import { describe, expect, it } from "vitest";
import { auditEventType } from "@nextgen/contracts";
import { auditPayloadSummary } from "./audit-labels";

describe("auditPayloadSummary", () => {
  it("org_logo_updated — adicionada", () => {
    expect(auditPayloadSummary("org_logo_updated", { has_logo: true })).toBe("Logo adicionada");
  });

  it("org_logo_updated — removida", () => {
    expect(auditPayloadSummary("org_logo_updated", { has_logo: false })).toBe("Logo removida");
  });

  it("role_changed — papeis em portugues", () => {
    expect(
      auditPayloadSummary("role_changed", { old_role: "viewer", new_role: "manager" }),
    ).toBe("Visualizador → Gerente");
  });

  it("card_updated — campos legiveis", () => {
    expect(
      auditPayloadSummary("card_updated", { changed_fields: ["title", "due_date"] }),
    ).toBe("Campos: Titulo, Prazo final");
  });

  it("board_renamed", () => {
    expect(auditPayloadSummary("board_renamed", { old_name: "A", new_name: "B" })).toBe("A → B");
  });

  it("cobre todos os tipos sem JSON cru no default", () => {
    for (const t of auditEventType.options) {
      const sample: Record<string, unknown> =
        t === "org_logo_updated"
          ? { has_logo: true }
          : t === "card_created"
            ? { title: "Teste" }
            : t === "role_changed"
              ? { old_role: "viewer", new_role: "admin" }
              : t === "board_renamed"
                ? { old_name: "X", new_name: "Y" }
                : {};
      const out = auditPayloadSummary(t, sample);
      expect(out).not.toMatch(/^\{/);
      expect(out.length).toBeGreaterThan(0);
    }
  });
});
