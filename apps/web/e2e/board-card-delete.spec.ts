import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Board card delete", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("exclui card com confirmacao no drawer", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "Delete QA " + Date.now();

    const todo = page.locator("section[data-testid^='kanban-column-']").first();
    await todo.getByPlaceholder("Novo card").fill(cardTitle);
    await todo.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todo.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });

    await todo.getByRole("button", { name: cardTitle }).click();
    await expect(page.getByTestId("card-drawer")).toBeVisible();
    await page.getByTestId("delete-card").click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(page.getByTestId("card-drawer")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: cardTitle })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("button", { name: cardTitle })).toHaveCount(0);
  });
});
