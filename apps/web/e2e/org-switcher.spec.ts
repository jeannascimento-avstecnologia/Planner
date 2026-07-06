import { test, expect } from "@playwright/test";
import { loginAsStandard, projectTile } from "./helpers";

test.describe("Org switcher (active org cookie)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("trocar org ativa atualiza Home", async ({ page }) => {
    await expect(projectTile(page, /Roadmap/)).toBeVisible({ timeout: 15_000 });

    await page.goto("/settings/organizations");
    await expect(page.getByTestId("organizations-hub-page")).toBeVisible({ timeout: 15_000 });

    const orgName = `QA Switch ${Date.now()}`;
    await page.getByTestId("create-org-button").click();
    await page.getByTestId("create-org-name").fill(orgName);
    await page.getByTestId("create-org-submit").click();
    await expect(page.getByTestId("create-org-dialog")).toBeHidden({ timeout: 15_000 });

    await page.goto("/boards");
    await expect(projectTile(page, /Roadmap/)).toHaveCount(0, { timeout: 15_000 });

    await page.goto("/settings/organizations");
    await page.getByTestId("org-manage-22222222-2222-2222-2222-222222222222").click();
    await page.getByTestId("set-active-org-22222222-2222-2222-2222-222222222222").click();

    await page.goto("/boards");
    await expect(projectTile(page, /Roadmap/)).toBeVisible({ timeout: 15_000 });
  });
});
