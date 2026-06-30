import { describe, expect, it } from "vitest";
import { buildBoardInviteEmail } from "./board-invite";

const baseParams = {
  to: "guest@example.com",
  boardName: "Roadmap",
  inviterName: "Admin User",
  role: "viewer",
  inviteUrl: "https://app.example.com/invite?token=abc123",
  appUrl: "https://app.example.com",
  expiresAt: new Date("2026-07-15T12:00:00Z"),
};

describe("buildBoardInviteEmail", () => {
  it("includes inline logo and gradient border with purple CTA", () => {
    const { html } = buildBoardInviteEmail(baseParams);
    expect(html).toMatch(/data:image\/png;base64,|https:\/\/app\.example\.com\/branding\/agify\.png/);
    expect(html).toContain("linear-gradient(135deg, #38BDF8");
    expect(html).toContain("background:#7C3AED");
    expect(html).toContain("Aceitar convite");
  });

  it("escapes HTML in dynamic fields", () => {
    const { html, subject } = buildBoardInviteEmail({
      ...baseParams,
      boardName: '<script>"Hack"</script>',
      inviterName: "João & Maria <test>",
    });
    expect(subject).toContain('<script>"Hack"</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("João &amp; Maria &lt;test&gt;");
    expect(html).toContain("&lt;script&gt;");
  });
});
