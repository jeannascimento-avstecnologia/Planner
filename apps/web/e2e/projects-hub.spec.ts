import { expect, test } from "@playwright/test";
import { loginAsStandard } from "./helpers";

test.describe("Projects hub", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("selecionar projeto abre painel de detalhe", async ({ page }) => {
    const tile = page.getByTestId("project-tile").first();
    await tile.getByTestId("project-tile-select").click();
    await expect(page).toHaveURL(/\?board=/);
    await expect(page.getByTestId("project-hub-detail")).toBeVisible();
    await expect(page.getByTestId("open-project")).toBeVisible();
  });

  test("painel do projeto tem engrenagem de configuracoes", async ({ page }) => {
    await page.getByTestId("project-tile").first().getByTestId("project-tile-select").click();
    await expect(page.getByTestId("project-hub-settings")).toBeVisible();
    await page.getByTestId("project-hub-settings").click();
    await expect(page.getByRole("heading", { name: /configuracoes/i })).toBeVisible();
  });

  test("trocar projeto limpa selecao", async ({ page }) => {
    await page.getByTestId("project-tile").first().getByTestId("project-tile-select").click();
    await expect(page.getByTestId("project-hub-detail")).toBeVisible();
    await page.getByRole("button", { name: "Trocar projeto" }).click();
    await expect(page).not.toHaveURL(/\?board=/);
    await expect(page.getByTestId("project-hub-detail")).not.toBeVisible();
  });

  test("tiles grid tem altura minima uniforme", async ({ page }) => {
    const tiles = page.getByTestId("project-tile-select");
    const count = await tiles.count();
    if (count < 2) test.skip();

    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      const box = await tiles.nth(i).boundingBox();
      if (box) heights.push(box.height);
    }
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    expect(max - min).toBeLessThanOrEqual(8);
  });
});
