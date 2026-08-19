import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Board column create", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("cria coluna pela UI", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const colName = "QA New Col " + Date.now();

    await page.getByTestId("new-column-section").getByPlaceholder("Nome da coluna").fill(colName);
    await page.getByRole("button", { name: "Adicionar coluna" }).click();

    const colInput = page.locator(`input[aria-label="Nome da coluna"][value="${colName}"]`);
    await expect(colInput).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(colInput).toBeVisible({ timeout: 15_000 });
  });
});
