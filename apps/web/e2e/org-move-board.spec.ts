import { test, expect } from "@playwright/test";
import { loginAsStandard, SEED_BOARD_ID } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Move board between orgs", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("owner move projeto para outra org com dupla confirmacao", async ({ page }) => {
    const destName = `QA Dest ${Date.now()}`;

    await page.goto("/settings/organizations");
    await page.getByTestId("create-org-button").click();
    await page.getByTestId("create-org-name").fill(destName);
    await page.getByTestId("create-org-submit").click();
    await expect(page.getByTestId("create-org-dialog")).toBeHidden({ timeout: 15_000 });

    const acmeCard = page.getByTestId("org-card-22222222-2222-2222-2222-222222222222");
    await acmeCard.getByRole("button", { name: "Expandir" }).click();
    await expect(acmeCard.getByTestId(`org-project-row-${SEED_BOARD_ID}`)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("org-manage-22222222-2222-2222-2222-222222222222").click();
    await page.getByTestId("org-quick-tab-projects").click();
    await page.getByTestId(`move-project-${SEED_BOARD_ID}`).click();
    await expect(page.getByTestId("move-project-dialog")).toBeVisible();

    await page.getByTestId("move-project-target").selectOption({ label: destName });
    await page.getByTestId("move-project-confirm").click();
    await page.getByTestId("move-project-checkbox").check();
    await page.getByTestId("move-project-confirm").click();

    await expect(page.getByTestId("move-project-dialog")).toBeHidden({ timeout: 15_000 });

    const destCard = page.locator("article").filter({ hasText: destName });
    await destCard.getByRole("button", { name: "Expandir" }).click();
    await expect(destCard.getByTestId(`org-project-row-${SEED_BOARD_ID}`)).toBeVisible({ timeout: 15_000 });
    await expect(acmeCard.getByTestId(`org-project-row-${SEED_BOARD_ID}`)).toHaveCount(0);

    await destCard.getByRole("button", { name: "Gerenciar organizacao" }).click();
    await page.getByTestId("org-quick-tab-projects").click();
    await page.getByTestId(`move-project-${SEED_BOARD_ID}`).click();
    await page.getByTestId("move-project-target").selectOption({ label: "Acme Inc" });
    await page.getByTestId("move-project-confirm").click();
    await page.getByTestId("move-project-checkbox").check();
    await page.getByTestId("move-project-confirm").click();
    await expect(page.getByTestId("move-project-dialog")).toBeHidden({ timeout: 15_000 });
    await page.getByRole("button", { name: "Fechar" }).click();

    await acmeCard.getByRole("button", { name: "Expandir" }).click();
    await expect(acmeCard.getByTestId(`org-project-row-${SEED_BOARD_ID}`)).toBeVisible({ timeout: 15_000 });
  });
});
