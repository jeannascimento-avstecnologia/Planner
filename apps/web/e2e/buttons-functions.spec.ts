import { test, expect } from "@playwright/test";
import {
  collectConsoleErrors,
  dismissBlockingTour,
  loginAsStandard,
  openSeedBoard,
  projectLink,
} from "./helpers";

const FATAL_CONSOLE = /Hydration|reading 'call'|is not defined|ChunkLoadError/i;

test.describe("Botoes e funcoes criticas", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
    await dismissBlockingTour(page);
  });

  test("criar projeto abre modal e fecha com cancelar", async ({ page }) => {
    await page.getByTestId("create-project-open").click();
    await expect(page.getByTestId("create-project-modal")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByTestId("create-project-modal")).toBeHidden();
  });

  test("page tour trigger existe em /boards e abre popover", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("ngp:page-tour-completed:home");
    });
    const trigger = page.getByTestId("page-tour-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator(".driver-popover").first()).toBeVisible({ timeout: 15_000 });
    const close = page.locator(".driver-popover-close-btn");
    if (await close.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await close.click();
    }
  });

  test("menu mobile abre sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.locator("aside.aurora-sidebar-gradient")).toBeVisible();
  });

  test("switcher hub lista/grid alterna visualizacao", async ({ page }) => {
    await page.getByRole("main").getByRole("button", { name: "Lista" }).click();
    await expect(page.getByText("Agrupar por").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("table").first()).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Grade" }).click();
    await expect(page.getByTestId("project-tile").first()).toBeVisible();
  });

  test("board: cria card inline na primeira coluna", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    await page.waitForLoadState("networkidle");
    await dismissBlockingTour(page);
    const cardTitle = "Btn Card " + Date.now();
    const col = page.locator("section[data-testid^='kanban-column-']").first();
    const cardInput = col.getByPlaceholder("Novo card");
    await cardInput.fill(cardTitle);
    await expect(cardInput).toHaveValue(cardTitle, { timeout: 10_000 });
    await col.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(col.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });
  });

  test("board: modos kanban/tabela/calendario/timeline", async ({ page }) => {
    await openSeedBoard(page);
    await dismissBlockingTour(page);
    for (const mode of ["Tabela", "Calendario", "Linha do tempo", "Arvore", "Kanban"] as const) {
      await page.getByRole("button", { name: mode }).click();
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("sign-out abre confirmacao (sem executar logout)", async ({ page }) => {
    await page.getByTestId("sign-out-button").click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/boards/);
  });

  test("sem erros fatais de console apos interacoes", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.getByTestId("create-project-open").click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Lista" }).click();
    await page.getByRole("button", { name: "Grade" }).click();
    expect(consoleErrors.filter((e) => FATAL_CONSOLE.test(e)), consoleErrors.join("\n")).toEqual([]);
  });
});
