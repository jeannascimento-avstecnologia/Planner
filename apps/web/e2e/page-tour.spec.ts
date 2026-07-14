import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

const ONBOARDING_TOUR_COMPLETED_KEY = "ngp:onboarding-tour-completed";
const PAGE_TOUR_PREFIX = "ngp:page-tour-completed:";

async function expandSidebar(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  const expand = page.getByRole("button", { name: "Expandir" });
  if (await expand.isVisible({ timeout: 2_000 }).catch(() => false)) await expand.click();
}

function tourPopover(page: import("@playwright/test").Page) {
  return page.locator(".driver-popover.agify-tour-popover");
}

test.describe("Tour por pagina", () => {
  test("abre automaticamente em /projects apos tour global concluido", async ({ page }) => {
    await page.addInitScript(
      ({ globalKey, pageKey }) => {
        localStorage.setItem(globalKey, "1");
        localStorage.removeItem(pageKey);
      },
      { globalKey: ONBOARDING_TOUR_COMPLETED_KEY, pageKey: `${PAGE_TOUR_PREFIX}projects` },
    );

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);
    await page.goto("/projects");

    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await expect(popover).toContainText("Hub de comparacao");
  });

  test("botao Ver tour desta pagina reabre o tour", async ({ page }) => {
    await page.addInitScript(
      ({ globalKey, pageKey }) => {
        localStorage.setItem(globalKey, "1");
        localStorage.setItem(pageKey, "1");
      },
      { globalKey: ONBOARDING_TOUR_COMPLETED_KEY, pageKey: `${PAGE_TOUR_PREFIX}projects` },
    );

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);
    await page.goto("/projects");

    await page.getByTestId("page-tour-trigger").click();
    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await expect(popover).toContainText("Hub de comparacao");
  });
});
