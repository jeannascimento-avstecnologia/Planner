import { expect, test } from "@playwright/test";
import { disableToursForE2E, loginAsStandard, openSeedBoard } from "./helpers";

test.describe("Board Tree View", () => {
  test.beforeEach(async ({ page }) => {
    await disableToursForE2E(page);
    await loginAsStandard(page);
  });

  test("switcher abre org-chart, cria filho e to-do", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Arvore" }).click();
    await expect(page.getByTestId("board-tree-view")).toBeVisible({ timeout: 15_000 });

    const root = page.getByTestId(/^tree-node-/).first();
    await expect(root).toBeVisible();
    const rootTestId = await root.getAttribute("data-testid");
    const rootId = rootTestId?.replace("tree-node-", "") ?? "";
    expect(rootId).toBeTruthy();

    await page.getByTestId(`tree-add-child-${rootId}`).click();
    const childTitle = `E2E child ${Date.now()}`;
    await page.getByTestId("create-child-title").fill(childTitle);
    await page.getByTestId(`tree-create-child-${rootId}`).getByRole("button", { name: "Criar" }).click();
    await expect(page.getByText(childTitle)).toBeVisible({ timeout: 15_000 });

    // React Flow edge pai→filho
    await expect(page.locator(".react-flow__edge").first()).toBeVisible({ timeout: 10_000 });

    const todoTitle = `E2E todo ${Date.now()}`;
    await page.getByTestId(`checklist-add-${rootId}`).locator("input").fill(todoTitle);
    await page.getByTestId(`checklist-add-${rootId}`).locator('button[aria-label="Adicionar to-do"]').click();
    await expect(page.getByText(todoTitle)).toBeVisible({ timeout: 15_000 });

    // + Filho = raiz Kanban (parent_id null) + edge de organograma
    await page.getByRole("button", { name: "Kanban" }).click();
    await expect(page.getByRole("button", { name: childTitle })).toBeVisible({ timeout: 10_000 });
  });

  test("seleciona galho e remove conexao", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Arvore" }).click();
    await expect(page.getByTestId("board-tree-view")).toBeVisible({ timeout: 15_000 });

    const root = page.getByTestId(/^tree-node-/).first();
    const rootId = (await root.getAttribute("data-testid"))?.replace("tree-node-", "") ?? "";
    expect(rootId).toBeTruthy();

    await page.getByTestId(`tree-add-child-${rootId}`).click();
    const childTitle = `E2E edge ${Date.now()}`;
    await page.getByTestId("create-child-title").fill(childTitle);
    await page.getByTestId(`tree-create-child-${rootId}`).getByRole("button", { name: "Criar" }).click();
    await expect(page.getByText(childTitle)).toBeVisible({ timeout: 15_000 });

    const edge = page.locator(".react-flow__edge").first();
    await expect(edge).toBeVisible({ timeout: 10_000 });
    await edge.click({ force: true });

    await expect(page.getByTestId("tree-edge-remove")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("tree-edge-remove").dispatchEvent("mousedown");

    await expect(page.getByText(childTitle)).toBeVisible();
    await expect(page.locator(".react-flow__edge")).toHaveCount(0, { timeout: 15_000 });
  });

  test("filtro texto aplica data-highlight nos nos", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Arvore" }).click();
    await expect(page.getByTestId("board-tree-view")).toBeVisible({ timeout: 15_000 });

    const root = page.getByTestId(/^tree-node-/).first();
    const rootTitle = (await root.innerText()).split("\n")[0]?.trim() ?? "";
    expect(rootTitle.length).toBeGreaterThan(0);

    const filterInput = page.locator('[data-tour="board-filters"] input[placeholder="Buscar por titulo"]');
    await filterInput.fill(rootTitle.slice(0, Math.min(6, rootTitle.length)));

    await expect
      .poll(async () => {
        const attrs = await page.getByTestId(/^tree-node-/).evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-highlight")),
        );
        return attrs.some((a) => a && a !== "none" && a !== "|1");
      }, { timeout: 5_000 })
      .toBe(true);
  });
});
