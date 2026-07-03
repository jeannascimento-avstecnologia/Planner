import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Board column delete", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("exclui coluna vazia com confirmacao", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const colName = "QA Del Col " + Date.now();

    await page.getByPlaceholder("Nome da coluna").fill(colName);
    await page.getByRole("button", { name: "Adicionar coluna" }).click();
    const colInput = page.locator(`input[aria-label="Nome da coluna"][value="${colName}"]`);
    await expect(colInput).toBeVisible({ timeout: 15_000 });

    const newColSection = page.locator("section").filter({ has: colInput });
    await newColSection.getByRole("button", { name: "Excluir coluna" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(colInput).toHaveCount(0, { timeout: 15_000 });
  });
});
