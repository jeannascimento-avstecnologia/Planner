import { test, expect, type Page } from "@playwright/test";
import { loginAsStandard, openSeedBoard } from "./helpers";

function closeStageManager(page: Page) {
  return page
    .getByRole("heading", { name: "Gerenciar estagios" })
    .locator("xpath=ancestor::*[@role='dialog'][1]")
    .getByRole("button", { name: "Fechar" })
    .last();
}

function drawerRoot(page: Page) {
  return page.getByTestId("card-drawer");
}

function drawerStageButton(page: Page) {
  return drawerRoot(page).getByTestId("stage-selector-trigger");
}

function drawerStageOption(page: Page, name: string) {
  return drawerRoot(page).getByTestId("stage-selector-menu").getByRole("button", { name, exact: true });
}

test.describe("Estagios", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
    await openSeedBoard(page);
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
    await closeStageManager(page).click();

    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await drawerStageButton(page).click();
    await drawerStageOption(page, stageName).click();
    await expect(page.getByText(stageName).first()).toBeVisible();
  });

  test("cria estagio inline na filter bar", async ({ page }) => {
    const stageName = "Filter Stage " + Date.now();
    await page.getByTestId("filter-stage-add").click();
    await page.getByPlaceholder("Novo estagio").fill(stageName);
    await page.getByPlaceholder("Novo estagio").press("Enter");
    await expect(page.getByTestId(/^filter-stage-/).filter({ hasText: stageName })).toBeVisible({ timeout: 15_000 });
  });

  test("cria estagio inline no stage selector do card", async ({ page }) => {
    const stageName = "Drawer Stage " + Date.now();
    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await drawerStageButton(page).click();
    await page.getByTestId("stage-selector-add").click();
    await page.getByPlaceholder("Nome do estagio").fill(stageName);
    await drawerRoot(page).getByRole("button", { name: "Criar", exact: true }).click();
    await expect(drawerStageOption(page, stageName)).toBeVisible({ timeout: 15_000 });
  });

  test("filtro por estagio Em Progresso", async ({ page }) => {
    const clearBtn = page.getByRole("button", { name: "Limpar" });
    if (await clearBtn.isVisible()) await clearBtn.click();

    await page.getByRole("button", { name: "RLS + pgTAP" }).click();
    await drawerStageButton(page).click();
    await drawerStageOption(page, "Em Progresso").click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "RLS + pgTAP" })).toBeVisible({ timeout: 10_000 });

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
    await closeStageManager(page).click();

    await page.getByRole("button", { name: "Walking skeleton de auth" }).click();
    await drawerStageButton(page).click();
    await drawerStageOption(page, stageName).click();
    await expect(page.getByText(stageName).first()).toBeVisible();

    await drawerStageButton(page).click();
    await drawerStageOption(page, "Cancelado").click();
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
    await drawerStageButton(page).click();
    await drawerStageOption(page, "Cancelado").click();
    await expect(page.getByRole("heading", { name: "Cancelar ticket no Tiflux?" })).toBeHidden();
    await expect(page.getByText("Cancelado").first()).toBeVisible();
  });
});
