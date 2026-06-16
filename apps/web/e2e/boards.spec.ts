import { test, expect, type Page } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Boards / Kanban", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("lista de boards mostra org e board do seed", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Projetos", exact: true })).toBeVisible();
    await expect(page.getByText("Acme Inc")).toBeVisible();
    await expect(projectLink(page, /Roadmap/)).toBeVisible();
  });

  test("cria um novo board e ele aparece na lista", async ({ page }) => {
    const name = "Board QA " + Date.now();
    await page.getByPlaceholder("Nome do projeto").fill(name);
    await page.getByPlaceholder("Descricao (opcional)").fill("Criado pelo E2E");
    await page.getByRole("button", { name: "Novo projeto" }).click();
    await expect(projectLink(page, new RegExp(name))).toBeVisible({ timeout: 15_000 });
  });

  test("abre board do seed e ve as colunas", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: "To Do", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Doing", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Done", exact: true })).toBeVisible();
  });

  test("cria coluna nova no board", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const colName = "QA Col " + Date.now();
    await page.getByPlaceholder("Nome da coluna").fill(colName);
    await page.getByRole("button", { name: "Adicionar coluna" }).click();
    await expect(page.getByRole("heading", { name: colName, exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("cria card numa coluna e ele persiste apos reload", async ({ page }) => {
    await projectLink(page, /Roadmap/).click();
    const cardTitle = "Card QA " + Date.now();

    const todo = page.locator("section").filter({
      has: page.getByRole("heading", { name: "To Do", exact: true }),
    });
    await todo.getByPlaceholder("Novo card").fill(cardTitle);
    await todo.getByRole("button", { name: "Adicionar", exact: true }).click();

    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(cardTitle)).toBeVisible();
  });
});
