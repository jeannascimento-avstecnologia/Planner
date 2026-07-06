import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

test.describe("Organizations menu", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("sidebar abre hub de organizacoes", async ({ page }) => {
    await page.getByRole("link", { name: "Organizacoes" }).click();
    await expect(page).toHaveURL(/\/settings\/organizations/);
    await expect(page.getByTestId("organizations-hub-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("organizations-panel")).toBeVisible();
    await expect(page.getByTestId("org-settings-tab-membros")).toHaveCount(0);
    await expect(page.getByText("Gerencie membros, convites e configuracoes da organizacao")).toHaveCount(0);
  });

  test("busca filtra projetos preservando org", async ({ page }) => {
    await page.goto("/settings/organizations");
    await page.getByTestId("organizations-search").fill("Roadmap");
    await expect(page.getByTestId("org-card-22222222-2222-2222-2222-222222222222")).toBeVisible();
    const acmeCard = page.getByTestId("org-card-22222222-2222-2222-2222-222222222222");
    await acmeCard.getByRole("button", { name: "Expandir" }).click();
    await expect(page.getByText("Roadmap")).toBeVisible();
  });

  test("engrenagem abre modal membros", async ({ page }) => {
    await page.goto("/settings/organizations");
    await page.getByTestId("org-manage-22222222-2222-2222-2222-222222222222").click();
    await expect(page.getByTestId("org-quick-manage-modal")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("org-members-table")).toBeVisible();
    await expect(page.getByTestId("org-quick-tab-invites")).toBeVisible();
  });

  test("criar organizacao via dialog", async ({ page }) => {
    await page.goto("/settings/organizations");
    const name = `QA Menu Org ${Date.now()}`;
    await page.getByTestId("create-org-button").click();
    await page.getByTestId("create-org-name").fill(name);
    await page.getByTestId("create-org-submit").click();
    await expect(page.getByTestId("create-org-dialog")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });
});
