import { test, expect } from "@playwright/test";
import { loginAsStandard, projectTile } from "./helpers";

test.describe("Tiflux — token por projeto", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  async function openProjectSettings(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Grade" }).click();
    const tile = projectTile(page, /Roadmap/);
    await tile.hover();
    await page.getByTestId("project-settings").first().click();
    await expect(page.getByTestId("project-settings-modal")).toBeVisible();
  }

  test("configura token, oculta apos salvar e reabre input ao desativar", async ({ page }) => {
    await openProjectSettings(page);

    const checkbox = page.getByTestId("project-settings-tiflux-enabled");
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
      await page.getByTestId("project-settings-save").click();
      await expect(page.getByTestId("project-settings-modal")).toBeHidden({ timeout: 15_000 });
      await openProjectSettings(page);
    }

    await page.getByTestId("project-settings-tiflux-enabled").check();
    await expect(page.getByTestId("project-settings-tiflux-token")).toBeVisible();
    await page.getByTestId("project-settings-tiflux-token").fill("test-token-e2e-123456");
    await page.getByTestId("project-settings-save").click();
    await expect(page.getByTestId("project-settings-modal")).toBeHidden({ timeout: 15_000 });

    await openProjectSettings(page);
    await expect(page.getByTestId("project-settings-tiflux-configured")).toBeVisible();
    await expect(page.getByTestId("project-settings-tiflux-token")).toHaveCount(0);

    await page.getByTestId("project-settings-tiflux-enabled").uncheck();
    await page.getByTestId("project-settings-save").click();
    await expect(page.getByTestId("project-settings-modal")).toBeHidden({ timeout: 15_000 });

    await openProjectSettings(page);
    await page.getByTestId("project-settings-tiflux-enabled").check();
    await expect(page.getByTestId("project-settings-tiflux-token")).toBeVisible();
  });
});
