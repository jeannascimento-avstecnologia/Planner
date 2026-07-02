import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, uniqueEmail } from "./helpers";

async function openOrgSettings(page: import("@playwright/test").Page) {
  await page.goto("/settings/organization");
  await expect(page.getByTestId("org-members-page")).toBeVisible({ timeout: 15_000 });
}

test.describe("Organization management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("menu da conta abre configuracoes da organizacao", async ({ page }) => {
    await page.getByRole("button", { name: "Menu da conta" }).click();
    await page.getByTestId("profile-org-settings").click();
    await expect(page).toHaveURL(/\/settings\/organization$/);
    await expect(page.getByTestId("org-members-table")).toBeVisible();
  });

  test("lista membros da organizacao", async ({ page }) => {
    await openOrgSettings(page);
    await expect(page.getByTestId("org-members-table")).toContainText("Admin Demo");
    await expect(page.getByTestId("org-members-table")).toContainText("Org Admin Demo");
  });

  test("owner altera papel de membro", async ({ page }) => {
    await openOrgSettings(page);
    const memberRow = page.getByTestId("org-member-row-77777777-7777-7777-7777-777777777777");
    await memberRow.getByTestId("org-member-role-77777777-7777-7777-7777-777777777777").selectOption("viewer");
    await expect(memberRow).toContainText("Visualizador");
  });

  test("viewer org nao acessa settings", async ({ page }) => {
    await loginAsViewer(page);
    await page.goto("/settings/organization");
    await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
  });
});
