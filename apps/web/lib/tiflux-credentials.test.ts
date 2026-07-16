import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  isLegacyTifluxEnvAllowed,
  resolveBoardTifluxTokenDetailed,
  TIFLUX_NOT_CONFIGURED_MSG,
  TIFLUX_SERVICE_UNAVAILABLE_MSG,
} from "./tiflux-credentials";

vi.mock("@/lib/supabase/service", () => ({
  tryCreateServiceClient: vi.fn(),
}));

import { tryCreateServiceClient } from "@/lib/supabase/service";

const mockTryCreate = vi.mocked(tryCreateServiceClient);

describe("tiflux-credentials", () => {
  beforeEach(() => {
    mockTryCreate.mockReset();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks legacy env in production", () => {
    expect(isLegacyTifluxEnvAllowed("production")).toBe(false);
    expect(isLegacyTifluxEnvAllowed("development")).toBe(true);
  });

  it("production: never falls back to TIFLUX_API_TOKEN", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TIFLUX_API_TOKEN", "global-leaky-token");
    mockTryCreate.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never);

    const result = await resolveBoardTifluxTokenDetailed("board-1");
    expect(result).toEqual({
      ok: false,
      code: "not_configured",
      message: TIFLUX_NOT_CONFIGURED_MSG,
    });
  });

  it("production: service unavailable does not use legacy token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TIFLUX_API_TOKEN", "global-leaky-token");
    mockTryCreate.mockReturnValue(null);

    const result = await resolveBoardTifluxTokenDetailed("board-1");
    expect(result).toEqual({
      ok: false,
      code: "service_unavailable",
      message: TIFLUX_SERVICE_UNAVAILABLE_MSG,
    });
  });

  it("production: rpc error does not use legacy token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TIFLUX_API_TOKEN", "global-leaky-token");
    mockTryCreate.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    } as never);

    const result = await resolveBoardTifluxTokenDetailed("board-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("rpc_error");
  });

  it("development: allows legacy env when board token missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TIFLUX_API_TOKEN", "dev-only-token");
    mockTryCreate.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never);

    const result = await resolveBoardTifluxTokenDetailed("board-1");
    expect(result).toEqual({
      ok: true,
      source: "legacy_env",
      creds: {
        token: "dev-only-token",
        apiUrl: "https://api.tiflux.com/api/v2",
      },
    });
  });

  it("returns board token when configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockTryCreate.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [{ token: "board-token", api_url: "https://api.tiflux.com/api/v2/" }],
        error: null,
      }),
    } as never);

    const result = await resolveBoardTifluxTokenDetailed("board-1");
    expect(result).toEqual({
      ok: true,
      source: "board",
      creds: {
        token: "board-token",
        apiUrl: "https://api.tiflux.com/api/v2",
      },
    });
  });
});
