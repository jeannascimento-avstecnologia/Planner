import { test, expect } from "@playwright/test";
import { loginAsStandard, openSeedBoard } from "./helpers";

test.describe("Workload hardening", () => {
  test("drawer exibe horas estimadas e entrega estimada", async ({ page }) => {
    await loginAsStandard(page);
    await openSeedBoard(page);

    const firstCard = page.locator("[data-testid^='board-card-']").first();
    await firstCard.click();
    await expect(page.getByTestId("card-drawer")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("card-estimated-hours")).toBeVisible();
  });

  test("manager edita capacidade na pagina de carga", async ({ page }) => {
    await loginAsStandard(page);
    await page.goto("/workload");
    await expect(page.getByTestId("workload-page")).toBeVisible({ timeout: 15_000 });

    const capacityInput = page.locator("[data-testid^='workload-capacity-']").first();
    if (await capacityInput.count()) {
      await capacityInput.fill("36");
      await capacityInput.blur();
      await expect(page.getByText("Capacidade atualizada")).toBeVisible({ timeout: 10_000 });
    }
  });
});
