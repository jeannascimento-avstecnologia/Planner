import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, openSeedBoard, projectLink } from "./helpers";

test.describe("Kanban add-card visibility (regressao pos-deploy)", () => {
  test("editor: form Adicionar visivel em cada coluna (incl. vazia)", async ({ page }) => {
    await loginAsStandard(page);
    await openSeedBoard(page);

    const columns = page.locator("section[data-testid^='kanban-column-']");
    await expect(columns.first()).toBeVisible();
    const count = await columns.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const col = columns.nth(i);
      const form = col.getByTestId("create-card-form");
      await expect(form, `coluna ${i} deve ter create-card-form`).toBeVisible();
      await expect(form.getByPlaceholder("Novo card")).toBeVisible();
      await expect(form.getByRole("button", { name: "Adicionar", exact: true })).toBeVisible();

      const box = await form.boundingBox();
      expect(box, `form coluna ${i} precisa de geometria`).toBeTruthy();
      expect(box!.height).toBeGreaterThan(20);
      expect(box!.width).toBeGreaterThan(40);
    }

    await expect(page.getByTestId("new-column-section")).toBeVisible();
  });

  test("editor: cria card pela UI apos form visivel", async ({ page }) => {
    await loginAsStandard(page);
    await projectLink(page, /Roadmap/).click();

    const todoCol = page.locator("section[data-testid^='kanban-column-']").first();
    const title = "AddCard QA " + Date.now();
    await expect(todoCol.getByTestId("create-card-form")).toBeVisible();
    await todoCol.getByPlaceholder("Novo card").fill(title);
    await todoCol.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todoCol.getByRole("button", { name: title })).toBeVisible({ timeout: 15_000 });
  });

  test("viewer: sem form Adicionar", async ({ page }) => {
    await loginAsViewer(page);
    await openSeedBoard(page);
    await expect(page.getByTestId("create-card-form")).toHaveCount(0);
  });
});
