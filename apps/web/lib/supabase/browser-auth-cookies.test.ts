import { describe, expect, it } from "vitest";
import { parseBrowserCookies, serializeSessionCookie } from "./browser-auth-cookies";

describe("browser auth session cookies", () => {
  it("parses values containing equals signs without truncation", () => {
    expect(
      parseBrowserCookies("theme=dark; sb-project-auth-token=base64-abc=="),
    ).toEqual([
      { name: "theme", value: "dark" },
      { name: "sb-project-auth-token", value: "base64-abc==" },
    ]);
  });

  it("omits positive Max-Age and Expires for a session cookie", () => {
    expect(
      serializeSessionCookie("sb-project-auth-token", "value", {
        path: "/",
        maxAge: 34_560_000,
        expires: new Date("2099-01-01"),
        sameSite: "lax",
        secure: true,
      }),
    ).toBe("sb-project-auth-token=value; Path=/; SameSite=Lax; Secure");
  });

  it("preserves Max-Age zero when Supabase removes stale chunks", () => {
    expect(
      serializeSessionCookie("sb-project-auth-token.1", "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      }),
    ).toBe("sb-project-auth-token.1=; Path=/; Max-Age=0; SameSite=Lax");
  });
});
