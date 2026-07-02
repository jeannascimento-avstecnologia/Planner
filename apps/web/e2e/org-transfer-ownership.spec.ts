import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

test.describe("Transfer organization ownership", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("owner ve secao de transferencia com membros elegiveis", async ({ page }) => {
    await page.goto("/settings/organization/settings");
    await expect(page.getByTestId("transfer-ownership-section")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("transfer-ownership-select")).toBeVisible();

    const options = page.getByTestId("transfer-ownership-select").locator("option");
    await expect(options).toHaveCount(2); // placeholder + Org Admin Demo
    await expect(page.getByTestId("transfer-ownership-select")).toContainText("Org Admin Demo");
  });

  test("abre confirmacao ao transferir propriedade", async ({ page }) => {
    await page.goto("/settings/organization/settings");
    await page.getByTestId("transfer-ownership-select").selectOption({ index: 1 });
    await page.getByTestId("transfer-ownership-open").click();
    await expect(page.getByRole("alertdialog")).toContainText("Confirmar transferencia");
  });
});
