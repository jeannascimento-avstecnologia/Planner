import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNoClientExposedSecrets } from "./env-guard";

describe("assertNoClientExposedSecrets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("nao lanca quando NEXT_PUBLIC so tem chaves publicas", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(() => assertNoClientExposedSecrets()).not.toThrow();
  });

  it("avisa em dev quando NEXT_PUBLIC contem fragmento proibido", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TEST_SERVICE_ROLE_KEY", "leak");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertNoClientExposedSecrets();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
