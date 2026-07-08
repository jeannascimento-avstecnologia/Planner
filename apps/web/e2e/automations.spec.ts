import { test, expect } from "@playwright/test";
import { loginAsOrgAdmin, openSeedBoard } from "./helpers";

test.describe("automations", () => {
  test("admin abre modal e ve abas", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await openSeedBoard(page);
    await page.getByTestId("board-automations-button").click();
    await expect(page.getByTestId("board-automations-modal")).toBeVisible();
    await page.getByTestId("automation-history-tab").click();
    await expect(page.getByTestId("automation-runs-list")).toBeVisible();
  });
});
