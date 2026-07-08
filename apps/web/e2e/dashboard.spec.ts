import { test, expect } from "@playwright/test";
import { loginAsOrgAdmin, openSeedBoard, SEED_BOARD_ID } from "./helpers";

test.describe("board dashboard", () => {
  test("manager ve dashboard do projeto", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await openSeedBoard(page);
    await page.getByTestId("board-dashboard-link").click();
    await expect(page.getByTestId("board-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("board-dashboard-charts")).toBeVisible();
  });

  test("rota direta carrega graficos", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await page.goto(`/boards/${SEED_BOARD_ID}/dashboard`);
    await expect(page.getByTestId("board-dashboard-page")).toBeVisible();
  });
});
