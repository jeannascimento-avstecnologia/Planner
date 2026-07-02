import { test, expect } from "@playwright/test";
import { loginAsStandard, uniqueEmail } from "./helpers";

test.describe("Organization invite flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("enviar convite org exibe link copiavel", async ({ page }) => {
    await page.goto("/settings/organization/invites");
    await expect(page.getByTestId("org-invite-form")).toBeVisible({ timeout: 15_000 });

    const email = uniqueEmail("org-invite");
    await page.getByTestId("org-invite-email-input").fill(email);
    await page.getByTestId("org-invite-email-add").click();
    await page.getByTestId("org-invite-send").click();

    await expect(page.getByTestId("org-invite-link-url")).toBeVisible({ timeout: 15_000 });
    const href = await page.getByTestId("org-invite-link-url").getAttribute("href");
    expect(href).toMatch(/\/invite\/org\?token=/);
  });

  test("visitante sem sessao e redirecionado ao login com next org", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/invite/org?token=e2e-org-test-token");

    await expect(page).toHaveURL(/\/login\?next=/);
    expect(page.url()).toContain(encodeURIComponent("/invite/org?token=e2e-org-test-token"));
  });

  test("convite org aparece na lista de pendentes", async ({ page }) => {
    await page.goto("/settings/organization/invites");
    const email = uniqueEmail("org-pending");
    await page.getByTestId("org-invite-email-input").fill(email);
    await page.getByTestId("org-invite-email-add").click();
    await page.getByTestId("org-invite-send").click();

    await expect(page.getByTestId("org-pending-invites-table")).toContainText(email, { timeout: 15_000 });
  });
});
