import { test, expect } from "@playwright/test";

test.describe("Departamentos", () => {
  test("owner ve aba departamentos no modal da org", async ({ page }) => {
    await page.goto("/settings/organizations");
    await page.getByTestId(/^org-manage-/).first().click();
    await expect(page.getByTestId("org-quick-tab-departments")).toBeVisible();
  });
});
