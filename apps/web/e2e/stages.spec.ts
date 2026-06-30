import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

test.describe("Estagios", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
    await projectLink(page, /Roadmap/).click();
  });

  test("abre drawer ao clicar no card", async ({ page }) => {
    await page.getByTestId(/board-card-/).first().click();
    await expect(page.getByRole("heading", { name: "Editar card" })).toBeVisible({ timeout: 10_000 });
  });

  test("abre gerenciador de estagios e mostra defaults", async ({ page }) => {
    await page.getByTestId("manage-stages").click();
    await expect(page.getByRole("heading", { name: "Gerenciar estagios" })).toBeVisible();
    await expect(page.locator('input[value="Parado"]')).toBeVisible();
    await expect(page.locator('input[value="Em Progresso"]')).toBeVisible();
    await expect(page.locator('input[value="Concluido"]')).toBeVisible();
    await expect(page.locator('input[value="Cancelado"]')).toBeVisible();
  });

  test("cria estagio custom e aplica em card", async ({ page }) => {
    const stageName = "QA Stage " + Date.now();
    await page.getByTestId("manage-stages").click();
    await page.getByPlaceholder("Nome do estagio").fill(stageName);
    await page.getByRole("button", { name: "Criar estagio" }).click();
    await page.getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await page.getByRole("button", { name: /Alterar estagio|Parado|Em Progresso/ }).first().click();
    await page.getByRole("button", { name: stageName }).click();
    await expect(page.getByText(stageName).first()).toBeVisible();
  });

  test("cria estagio inline na filter bar", async ({ page }) => {
    const stageName = "Filter Stage " + Date.now();
    await page.getByTestId("filter-stage-add").click();
    await page.getByPlaceholder("Novo estagio").fill(stageName);
    await page.getByRole("button", { name: "Criar", exact: true }).click();
    await expect(page.getByRole("button", { name: stageName })).toBeVisible({ timeout: 15_000 });
  });

  test("cria estagio inline no stage selector do card", async ({ page }) => {
    const stageName = "Drawer Stage " + Date.now();
    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await page.getByRole("button", { name: /Alterar estagio|Parado|Em Progresso/ }).first().click();
    await page.getByTestId("stage-selector-add").click();
    await page.getByPlaceholder("Nome do estagio").fill(stageName);
    await page.getByRole("button", { name: "Criar", exact: true }).click();
    await expect(page.getByRole("button", { name: stageName })).toBeVisible({ timeout: 15_000 });
  });

  test("filtro por estagio Em Progresso", async ({ page }) => {
    await page.getByTestId("filter-stage-em_progresso").click();
    await expect(page.getByRole("button", { name: "Walking skeleton de auth" })).toBeHidden();
    await expect(page.getByRole("button", { name: "RLS + pgTAP" })).toBeVisible();
  });

  test("filtro Sem estagio", async ({ page }) => {
    await page.getByTestId("filter-stage-none").click();
    const visibleCards = page.locator("section").getByRole("button").filter({ hasText: /.+/ });
    await expect(visibleCards.first()).toBeVisible();
  });

  test("link mostrar apontamentos oculto sem ticket tiflux", async ({ page }) => {
    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await expect(page.getByTestId("tiflux-show-appointments")).toBeHidden();
  });

  test("altera estagio custom para Cancelado", async ({ page }) => {
    const stageName = "Switch Stage " + Date.now();
    await page.getByTestId("manage-stages").click();
    await page.getByPlaceholder("Nome do estagio").fill(stageName);
    await page.getByRole("button", { name: "Criar estagio" }).click();
    await page.getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await page.getByRole("button", { name: /Alterar estagio|Parado|Em Progresso/ }).first().click();
    await page.getByRole("button", { name: stageName }).click();
    await expect(page.getByText(stageName).first()).toBeVisible();

    await page.getByRole("button", { name: /Alterar estagio|Parado|Em Progresso/ }).first().click();
    await page.getByRole("button", { name: "Cancelado" }).click();
    await expect(page.getByText("Card nao encontrado").first()).toBeHidden();
    await expect(page.getByText("Cancelado").first()).toBeVisible();
  });

  test("exclui estagio custom com confirmacao no gerenciador", async ({ page }) => {
    const stageName = "Delete Stage " + Date.now();
    await page.getByTestId("manage-stages").click();
    await page.getByPlaceholder("Nome do estagio").fill(stageName);
    await page.getByRole("button", { name: "Criar estagio" }).click();
    await expect(page.getByRole("heading", { name: "Gerenciar estagios" })).toBeVisible();

    const row = page.locator("li").filter({ has: page.locator(`input[value="${stageName}"]`) });
    await row.getByRole("button", { name: `Excluir estagio ${stageName}` }).click();
    await expect(page.getByRole("heading", { name: "Excluir estagio?" })).toBeVisible();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.locator(`input[value="${stageName}"]`)).toBeHidden({ timeout: 15_000 });
  });

  test("altera estagio para Cancelado com ticket tiflux sem dialog", async ({ page }) => {
    await page.getByRole("button", { name: "RLS + pgTAP" }).click();
    await page.getByRole("button", { name: /Alterar estagio|Parado|Em Progresso|Concluido/ }).first().click();
    await page.getByRole("button", { name: "Cancelado" }).click();
    await expect(page.getByRole("heading", { name: "Cancelar ticket no Tiflux?" })).toBeHidden();
    await expect(page.getByText("Cancelado").first()).toBeVisible();
  });
});
