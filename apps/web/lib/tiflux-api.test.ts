import { describe, expect, it, vi, afterEach } from "vitest";
import {
  mapTifluxApiErrorForSettings,
  validateTifluxApiToken,
} from "./tiflux-api";

describe("tiflux-api token validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapTifluxApiErrorForSettings maps auth errors", () => {
    expect(mapTifluxApiErrorForSettings(new Error("Tiflux HTTP 401"))).toBe(
      "Codigo de API invalido ou sem permissao no Tiflux.",
    );
    expect(mapTifluxApiErrorForSettings(new Error("Unauthorized"))).toBe(
      "Codigo de API invalido ou sem permissao no Tiflux.",
    );
  });

  it("validateTifluxApiToken succeeds on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
    await expect(validateTifluxApiToken("valid-token-12345678")).resolves.toBeUndefined();
  });

  it("validateTifluxApiToken rejects on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );
    await expect(validateTifluxApiToken("invalid-token-12345678")).rejects.toThrow("Unauthorized");
  });
});
