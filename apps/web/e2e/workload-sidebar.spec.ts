import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, openSeedBoard, SEED_BOARD_ID } from "./helpers";

test.describe("Workload", () => {
  test("owner acessa pagina com navegador de semana", async ({ page }) => {
    await loginAsStandard(page);
    await page.goto("/workload");
    await expect(page.getByTestId("workload-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("workload-week-nav")).toBeVisible();
  });

  test("viewer nao ve link Carga e e redirecionado", async ({ page }) => {
    await loginAsViewer(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible()) await expand.click();

    await expect(page.locator("aside").getByRole("link", { name: "Carga" })).toHaveCount(0);

    await page.goto("/workload");
    await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
  });
});

test.describe("Sidebar — projetos recentes colapsados", () => {
  test("exibe icone colorido do projeto recente quando sidebar colapsada", async ({ page }) => {
    await loginAsStandard(page);
    await openSeedBoard(page);

    await page.goto("/boards");
    await page.setViewportSize({ width: 1280, height: 800 });

    const collapse = page.getByRole("button", { name: "Recolher" });
    if (await collapse.isVisible()) await collapse.click();

    await expect(page.getByTestId("recent-projects-collapsed")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId(`recent-board-icon-${SEED_BOARD_ID}`)).toBeVisible();
  });
});
