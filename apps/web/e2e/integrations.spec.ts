import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

test.describe("integrations hub", () => {
  test("admin acessa hub e paginas filhas", async ({ page }) => {
    await loginAsStandard(page);
    await page.goto("/settings/integrations");
    await expect(page).toHaveURL(/\/settings\/integrations/, { timeout: 15_000 });
    await expect(page.getByTestId("integrations-hub-page")).toBeVisible();
    await page.getByTestId("integration-card-slack").click();
    await expect(page.getByTestId("slack-integration-page")).toBeVisible();
    await page.goto("/settings/integrations/google");
    await expect(page.getByTestId("google-integration-page")).toBeVisible();
  });
});
