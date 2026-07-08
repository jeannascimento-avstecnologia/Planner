import { test, expect } from "@playwright/test";

test.describe("Plan page", () => {
  test("loads plan route with sidebar nav target", async ({ page }) => {
    await page.goto("/login");
    // Requires authenticated session in CI — smoke structure only when logged in
    test.skip(!process.env.E2E_USER_EMAIL, "E2E_USER_EMAIL not set");

    await page.goto("/plan");
    await expect(page.getByTestId("plan-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("plan-client")).toBeVisible();
    await expect(page.getByTestId("plan-sidebar")).toBeVisible();
  });
});

test.describe("Workload 15d toggle", () => {
  test("workload page has view toggle", async ({ page }) => {
    test.skip(!process.env.E2E_USER_EMAIL, "E2E_USER_EMAIL not set");
    await page.goto("/workload?mode=15d");
    await expect(page.getByTestId("workload-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("workload-view-toggle")).toBeVisible();
  });
});
