import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

test.describe("Centro de Ajuda", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  async function expandSidebar(page: import("@playwright/test").Page) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible()) await expand.click();
  }

  test("sidebar exibe Ajuda acima de Configuracoes", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");
    const helpLink = aside.getByTestId("sidebar-help-link");
    const settingsLink = aside.getByRole("link", { name: "Configuracoes" });

    await expect(helpLink).toBeVisible();
    await expect(helpLink).toContainText("Ajuda");
    await expect(settingsLink).toBeVisible();

    const helpBox = await helpLink.boundingBox();
    const settingsBox = await settingsLink.boundingBox();
    expect(helpBox).not.toBeNull();
    expect(settingsBox).not.toBeNull();
    expect(helpBox!.y).toBeLessThan(settingsBox!.y);
  });

  test("click navega para /help com categorias e secoes-chave", async ({ page }) => {
    await expandSidebar(page);
    await page.locator("aside.aurora-sidebar-gradient").getByTestId("sidebar-help-link").click();
    await expect(page).toHaveURL(/\/help/, { timeout: 20_000 });
    await expect(page.getByTestId("help-page")).toBeVisible();
    await expect(page.getByTestId("help-center")).toBeVisible();

    await expect(page.getByTestId("help-category-projects")).toBeVisible();
    await expect(page.getByTestId("help-category-planning")).toBeVisible();
    await expect(page.getByTestId("help-category-settings")).toBeVisible();

    await expect(page.getByTestId("help-section-calendar")).toBeVisible();
    await expect(page.getByTestId("help-section-plan")).toBeVisible();
    await expect(page.getByTestId("help-section-settings-hub")).toBeVisible();
  });

  test("link Abrir pagina do Calendario aponta para /calendar", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByTestId("help-section-calendar")).toBeVisible();

    const calendarSection = page.getByTestId("help-section-calendar");
    await calendarSection.locator("summary").click();
    const openLink = calendarSection.getByRole("link", { name: /Abrir pagina/i });
    await expect(openLink).toHaveAttribute("href", "/calendar");
  });
});
