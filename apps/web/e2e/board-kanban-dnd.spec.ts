import { test, expect } from "@playwright/test";
import { KANBAN_DRAG_ACTIVATION_DELAY_MS } from "../lib/kanban-dnd";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Board Kanban DnD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("arrasta card da primeira coluna para a segunda (hold + move)", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "DnD QA " + Date.now();

    const columns = page.locator("section[data-testid^='kanban-column-']");
    const todoCol = columns.nth(0);
    const doingCol = columns.nth(1);

    await todoCol.getByPlaceholder("Novo card").fill(cardTitle);
    await todoCol.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todoCol.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });

    const cardRow = todoCol.getByTestId(/^sortable-card-/).filter({ hasText: cardTitle });
    await cardRow.hover();
    await page.mouse.down();
    await page.waitForTimeout(KANBAN_DRAG_ACTIVATION_DELAY_MS + 20);
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
