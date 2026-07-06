import { test, expect } from "@playwright/test";
import { loginAsStandard, openSeedBoard } from "./helpers";

test.describe("Sidebar — navegacao entre paginas", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  async function expandSidebar(page: import("@playwright/test").Page) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible()) await expand.click();
  }

  test("navega para todas as rotas principais sem timeout", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");

    await aside.getByRole("link", { name: "Calendario" }).click();
    await expect(page).toHaveURL(/\/calendar/, { timeout: 20_000 });
    await expect(page.locator("main")).toBeVisible();

    await aside.getByRole("link", { name: "Projetos" }).click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

    await aside.getByRole("link", { name: "Organizacoes" }).click();
    await expect(page).toHaveURL(/\/settings\/organizations/, { timeout: 20_000 });
    await expect(page.getByTestId("organizations-hub-page")).toBeVisible();

    await aside.getByRole("link", { name: "Carga" }).click();
    await expect(page).toHaveURL(/\/workload/, { timeout: 20_000 });
    await expect(page.getByTestId("workload-page")).toBeVisible();

    await aside.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/boards$/, { timeout: 20_000 });
  });

  test("re-clique na mesma rota nao trava navegacao subsequente", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");

    await aside.getByRole("link", { name: "Calendario" }).click();
    await expect(page).toHaveURL(/\/calendar/, { timeout: 20_000 });

    await aside.getByRole("link", { name: "Calendario" }).click();
    await expect(page).toHaveURL(/\/calendar/);

    await aside.getByRole("link", { name: "Projetos" }).click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
  });

  test("navega do board para home via sidebar", async ({ page }) => {
    await openSeedBoard(page);
    await expandSidebar(page);
    await page.locator("aside.aurora-sidebar-gradient").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/boards$/, { timeout: 20_000 });
  });
});
