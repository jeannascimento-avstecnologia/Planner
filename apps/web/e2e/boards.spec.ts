import { test, expect, type Page } from "@playwright/test";
import { loginAsStandard, openSeedBoard, projectLink } from "./helpers";

test.describe("Boards / Kanban", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("lista de boards mostra org e board do seed", async ({ page }) => {
    await expect(page.getByRole("main").getByRole("heading", { name: "Home", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Acme Inc")).toBeVisible();
    await expect(projectLink(page, /Roadmap/)).toBeVisible();
  });

  test("cria um novo board e ele aparece na lista", async ({ page }) => {
    const name = "Board QA " + Date.now();
    await page.getByTestId("create-project-open").click();
    await expect(page.getByTestId("create-project-modal")).toBeVisible();
    await page.locator('#create-project-form input[name="name"]').fill(name);
    await page.locator('#create-project-form input[name="description"]').fill("Criado pelo E2E");
    await page.getByTestId("create-project-submit").click();
    await expect(projectLink(page, new RegExp(name))).toBeVisible({ timeout: 15_000 });
  });

  test("clique no tile abre board diretamente", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/);
    await expect(page).not.toHaveURL(/\?board=/);
  });

  test("abre board do seed e ve as colunas", async ({ page }) => {
    await openSeedBoard(page);
    const headers = page.locator('input[aria-label="Nome da coluna"]');
    await expect(headers.first()).toBeVisible({ timeout: 15_000 });
    expect(await headers.count()).toBeGreaterThanOrEqual(3);
  });

  test("cria coluna nova no board", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    await page.waitForLoadState("networkidle");
    const colName = "QA Col " + Date.now();
    const newColInput = page.getByPlaceholder("Nome da coluna");
    await newColInput.fill(colName);
    await expect(newColInput).toHaveValue(colName, { timeout: 10_000 });
    await page.getByRole("button", { name: "Adicionar coluna" }).click();
    await expect(page.locator(`input[aria-label="Nome da coluna"][value="${colName}"]`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("renomeia coluna no board", async ({ page }) => {
    await openSeedBoard(page);
    await page.waitForLoadState("networkidle");
    const colName = "QA Rename " + Date.now();
    const newColInput = page.getByPlaceholder("Nome da coluna");
    await newColInput.fill(colName);
    await expect(newColInput).toHaveValue(colName, { timeout: 10_000 });
    await page.getByRole("button", { name: "Adicionar coluna" }).click();
    const input = page.locator(`input[aria-label="Nome da coluna"][value="${colName}"]`);
    await expect(input).toBeVisible({ timeout: 15_000 });

    const renamed = colName + " OK";
    await input.fill(renamed);
    await input.blur();
    await expect(page.locator(`input[aria-label="Nome da coluna"][value="${renamed}"]`)).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`input[aria-label="Nome da coluna"][value="${renamed}"]`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("cria card numa coluna e ele persiste apos reload", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "Card QA " + Date.now();

    const todo = page.locator("section").filter({
      has: page.locator('input[aria-label="Nome da coluna"]'),
    }).first();
    await todo.getByPlaceholder("Novo card").fill(cardTitle);
    await todo.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todo.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByRole("button", { name: cardTitle })).toBeVisible();
  });

  test("cria card sem duplicar tiles na coluna", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "Card Dedupe " + Date.now();

    const todo = page.locator("section[data-testid^='kanban-column-']").first();
    await todo.getByPlaceholder("Novo card").fill(cardTitle);
    await todo.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(todo.getByRole("button", { name: cardTitle })).toBeVisible({ timeout: 15_000 });

    await expect(todo.getByRole("button", { name: cardTitle })).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole("button", { name: cardTitle })).toHaveCount(1);
  });

  test("switcher oferece quatro modos de visualizacao", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    await expect(page.getByRole("button", { name: "Kanban" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Linha do tempo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Calendario" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tabela" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Arvore" })).toBeVisible();
  });

  test("filtro de marcador persiste ao trocar para tabela", async ({ page }) => {
    await openSeedBoard(page);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Walking skeleton de auth")).toBeVisible();
    await page.getByRole("button", { name: "backend", exact: true }).click();
    await page.getByRole("button", { name: "Tabela" }).click();
    await expect(page.getByText("Walking skeleton de auth")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("visualizacao lista de projetos com agrupamento", async ({ page }) => {
    await page.getByRole("button", { name: "Lista" }).click();
    await expect(page.getByText("Agrupar por").first()).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
    await expect(page.locator("table").getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
  });
});
