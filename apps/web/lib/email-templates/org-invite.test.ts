import { describe, expect, it } from "vitest";
import { buildOrgInviteEmail } from "./org-invite";

const baseParams = {
  to: "guest@example.com",
  orgName: "Acme Inc",
  inviterName: "Admin User",
  role: "viewer",
  inviteUrl: "https://app.example.com/invite/org?token=abc123",
  appUrl: "https://app.example.com",
  expiresAt: new Date("2026-07-15T12:00:00Z"),
};

describe("buildOrgInviteEmail", () => {
  it("includes branded layout, preheader and org copy", () => {
    const { html, text, subject } = buildOrgInviteEmail(baseParams);
    expect(subject).toContain("Acme Inc");
    expect(html).toMatch(/data:image\/png;base64,|https:\/\/app\.example\.com\/branding\/agify\.png/);
    expect(html).toContain("display:none");
    expect(html).toContain("Voce foi convidado para uma organizacao");
    expect(html).toContain("Aceitar convite");
    expect(text).toContain("Agify | Convite de organizacao");
  });

  it("escapes HTML in dynamic fields", () => {
    const { html } = buildOrgInviteEmail({
      ...baseParams,
      orgName: '<script>"Hack"</script>',
      inviterName: "Joao & Maria <test>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Joao &amp; Maria &lt;test&gt;");
  });
});
