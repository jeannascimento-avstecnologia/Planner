import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Board Kanban DnD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("arrasta card da primeira coluna para a segunda pelo handle", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "DnD QA " + Date.now();

    const columns = page.locator("section[data-testid^='kanban-column-']");
    const todoCol = columns.nth(0);
    const doingCol = columns.nth(1);

    await todoCol.getByPlaceholder("Novo card").fill(cardTitle);
    await todoCol.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todoCol.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });

    const cardRow = todoCol.getByTestId(/^sortable-card-/).filter({ hasText: cardTitle });
    const handle = cardRow.getByRole("button", { name: "Mover card" });
    await handle.hover();
    await page.mouse.down();
    const targetBox = await doingCol.getByTestId(/^kanban-column-cards-/).boundingBox();
    if (!targetBox) throw new Error("drop target missing");
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 12 });
    await page.mouse.up();

    await expect(doingCol.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });
    await expect(todoCol.getByRole("button", { name: cardTitle })).toHaveCount(0);

    await page.reload();
    await expect(doingCol.getByRole("button", { name: cardTitle })).toBeVisible();
  });
});
