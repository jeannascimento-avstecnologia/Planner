import { describe, expect, it } from "vitest";
import { isTifluxConfigured, parseBoardIntegrations } from "./board-integrations";

describe("board-integrations", () => {
  it("parse configured flag", () => {
    const parsed = parseBoardIntegrations({
      tiflux: { clientName: "Acme", configured: true },
    });
    expect(parsed.tiflux?.configured).toBe(true);
    expect(isTifluxConfigured({ tiflux: { configured: true } })).toBe(true);
    expect(isTifluxConfigured({ tiflux: { configured: false } })).toBe(false);
  });
});
