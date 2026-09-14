import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, openSeedBoard, SEED_BOARD_ID } from "./helpers";

test.describe("Workload", () => {
  test("owner acessa pagina com navegador de semana", async ({ page }) => {
    await loginAsStandard(page);
    await page.goto("/workload");
    await expect(page.getByTestId("workload-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("workload-week-nav")).toBeVisible();
    await expect(page.getByTestId("workload-org-switcher")).toBeVisible();
    await expect(page.getByTestId("workload-org-switcher")).toContainText("Organizacao ativa");
  });

  test("gestor em 2+ orgs troca tenant e recarrega carga", async ({ page }) => {
    await loginAsStandard(page);
    const orgName = `QA Workload Org ${Date.now()}`;
    await page.goto("/settings/organizations");
    await page.getByTestId("create-org-button").click();
    await page.getByTestId("create-org-name").fill(orgName);
    await page.getByTestId("create-org-submit").click();
    await expect(page.getByTestId("create-org-dialog")).toBeHidden({ timeout: 15_000 });

    await page.goto("/workload");
    await expect(page.getByTestId("workload-page")).toBeVisible({ timeout: 15_000 });
    const switcher = page.getByTestId("workload-org-switcher");
    await expect(switcher).toContainText(orgName);

    await page.getByTestId("workload-org-switcher-trigger").click();
    await page.getByTestId("workload-org-option-22222222-2222-2222-2222-222222222222").click();
    await expect(switcher).toContainText("Acme Inc");
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
