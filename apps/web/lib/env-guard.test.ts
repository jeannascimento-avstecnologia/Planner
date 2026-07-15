import { describe, expect, it, vi } from "vitest";
import { assertNoClientExposedSecrets } from "./env-guard";

describe("assertNoClientExposedSecrets", () => {
  it("nao lanca quando NEXT_PUBLIC so tem chaves publicas", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(() => assertNoClientExposedSecrets()).not.toThrow();
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  it("avisa em dev quando NEXT_PUBLIC contem fragmento proibido", () => {
    const prevNode = process.env.NODE_ENV;
    const prevKey = process.env.NEXT_PUBLIC_TEST_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_TEST_SERVICE_ROLE_KEY = "leak";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertNoClientExposedSecrets();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    delete process.env.NEXT_PUBLIC_TEST_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = prevNode;
  });
});
