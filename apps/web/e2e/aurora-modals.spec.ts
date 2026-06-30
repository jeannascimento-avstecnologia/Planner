import { test, expect } from "@playwright/test";
import { loginAsStandard, openSeedBoard } from "./helpers";

test.describe("Aurora overlays e modais", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("modal compartilhar usa overlay aurora", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Compartilhar" }).click();
    await expect(page.getByTestId("board-access-modal")).toBeVisible();
    await expect(page.locator(".aurora-overlay")).toBeVisible();
  });

  test("popover de notificacoes usa surface tematica", async ({ page }) => {
    const bell = page.locator("header.aurora-topbar-solid").getByRole("button", { name: "Notificacoes" });
    await bell.click();
    await expect(page.getByTestId("notification-popover")).toBeVisible();
    await expect(page.getByTestId("notification-popover")).toHaveClass(/aurora-modal-enter/);
  });

  test("modal agenda calendario usa aurora-overlay", async ({ page }) => {
    await page.goto("/calendar");
    const calendarGrid = page.locator("section").filter({ hasText: "Dom" }).first();
    await calendarGrid.locator("button").last().click();
    await expect(page.getByTestId("deadline-agenda-modal")).toBeVisible();
    await expect(page.locator(".aurora-overlay")).toBeVisible();
  });
});

test.describe("Invite auth shell", () => {
  test("convite invalido sem token usa auth shell", async ({ page }) => {
    await page.goto("/invite");
    await expect(page.locator("main.aurora-sidebar-pattern")).toBeVisible();
    await expect(page.locator("main.aurora-sidebar-pattern > .auth-card")).toBeVisible();
    await expect(page.getByAltText("Agify")).toBeVisible();
    await expect(page.getByText("Convite invalido.")).toBeVisible();
  });
});
