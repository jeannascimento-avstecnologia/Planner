import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, loginAsOrgAdmin } from "./helpers";

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
    await memberRow.getByTestId("org-member-role-77777777-7777-7777-7777-777777777777").selectOption("admin");
    await expect(memberRow).toContainText("Administrador");
  });

  test("org admin ve membros mas nao altera papeis", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await openOrgSettings(page);
    await expect(page.getByTestId("org-members-table")).toBeVisible();
    const memberRow = page.getByTestId("org-member-row-11111111-1111-1111-1111-111111111111");
    await expect(memberRow).toContainText("Proprietario");
    await expect(
      memberRow.getByTestId("org-member-role-11111111-1111-1111-1111-111111111111"),
    ).toHaveCount(0);
  });

  test("viewer org acessa membros read-only", async ({ page }) => {
    await loginAsViewer(page);
    await openOrgSettings(page);
    await expect(page.getByTestId("org-members-table")).toBeVisible();
    await expect(page.getByTestId("org-members-table")).toContainText("Admin Demo");
    await expect(
      page.getByTestId("org-member-role-11111111-1111-1111-1111-111111111111"),
    ).toHaveCount(0);
    await page.goto("/settings/organization/invites");
    await expect(page.getByText(/Apenas proprietario ou gerente/i)).toBeVisible();
  });
});
