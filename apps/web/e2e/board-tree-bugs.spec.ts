import { expect, test } from "@playwright/test";
import { disableToursForE2E, loginAsStandard } from "./helpers";

/** Board do vídeo (cloud) — seed 3333… não existe neste env. */
const VIDEO_BOARD_ID = "e66af400-26ed-4517-8d12-06cd77c5655d";

/**
 * Tester — cenários do vídeo (filtro vazio, remover aresta, multi-pai).
 * Falha → devolver ao debugger. Não marcar OK sem passar.
 */

async function openVideoBoardTree(page: import("@playwright/test").Page) {
  await page.goto(`/boards/${VIDEO_BOARD_ID}?view=tree`);
  const tree = page.getByTestId("board-tree-view");
  await expect(tree).toBeVisible({ timeout: 20_000 });
  return tree;
}

test.describe("Tree bugs — E2E (vídeo)", () => {
  test.beforeEach(async ({ page }) => {
    await disableToursForE2E(page);
    await loginAsStandard(page);
  });

  test("remover aresta + filtro empty banner", async ({ page }) => {
    await openVideoBoardTree(page);

    const edgeCountBefore = await page.locator(".react-flow__edge").count();
    if (edgeCountBefore === 0) {
      const root = page.getByTestId(/^tree-node-/).first();
      const rootId = (await root.getAttribute("data-testid"))?.replace("tree-node-", "") ?? "";
      expect(rootId).toBeTruthy();
      await page.getByTestId(`tree-add-child-${rootId}`).click();
      const childTitle = `E2E rm ${Date.now()}`;
      await page.getByTestId("create-child-title").fill(childTitle);
      await page.getByTestId(`tree-create-child-${rootId}`).getByRole("button", { name: "Criar" }).click();
      await expect(page.getByText(childTitle)).toBeVisible({ timeout: 15_000 });
    }

    await expect(page.locator(".react-flow__edge").first()).toBeVisible({ timeout: 10_000 });
    const edgesBefore = await page.locator(".react-flow__edge").count();

    const removeBtn = page.getByTestId("tree-edge-remove").first();
    await expect(removeBtn).toBeVisible({ timeout: 5_000 });
    await removeBtn.click({ force: true });
    await expect
      .poll(async () => page.locator(".react-flow__edge").count(), { timeout: 15_000 })
      .toBeLessThan(edgesBefore);

    const filterInput = page.locator(
      '[data-tour="board-filters"] input[placeholder="Buscar por titulo"]',
    );
    await filterInput.fill(`zzz-no-match-${Date.now()}`);
    await expect(page.getByTestId("tree-filter-empty")).toBeVisible({ timeout: 5_000 });
  });

  test("multi-pai: segundo connect → toast + 2 arestas", async ({ page }) => {
    await openVideoBoardTree(page);

    const nodes = page.getByTestId(/^tree-node-/);
    await expect(nodes.first()).toBeVisible();
    const count = await nodes.count();
    test.skip(count < 2, "precisa de >=2 cards no board do vídeo");

    const idA = (await nodes.nth(0).getAttribute("data-testid"))!.replace("tree-node-", "");
    const idB = (await nodes.nth(1).getAttribute("data-testid"))!.replace("tree-node-", "");

    await page.getByTestId(`tree-add-child-${idA}`).click({ force: true });
    const childTitle = `E2E multi ${Date.now()}`;
    await page.getByTestId("create-child-title").fill(childTitle);
    await page
      .getByTestId(`tree-create-child-${idA}`)
      .getByRole("button", { name: "Criar" })
      .click({ force: true });
    await expect(page.getByText(childTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".react-flow__edge").filter({ hasText: "" })).toBeVisible({
      timeout: 10_000,
    }).catch(() => undefined);
    await expect(page.locator(".react-flow__edge").first()).toBeVisible({ timeout: 10_000 });
    const edgesAfterCreate = await page.locator(".react-flow__edge").count();
    expect(edgesAfterCreate).toBeGreaterThanOrEqual(1);

    const childNode = page.getByTestId(/^tree-node-/).filter({ hasText: childTitle });
    const outB = page.getByTestId(`tree-output-handle-${idB}`);
    const inChild = childNode.locator(".react-flow__handle").first();
    await outB.dragTo(inChild, { force: true });

    await expect(page.getByText("Aresta multi-pai conectada")).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => page.locator(".react-flow__edge").count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(edgesAfterCreate + 1);
  });
});
