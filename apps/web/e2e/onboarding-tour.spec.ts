import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer } from "./helpers";

const ONBOARDING_TOUR_COMPLETED_KEY = "ngp:onboarding-tour-completed";

async function expandSidebar(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  const expand = page.getByRole("button", { name: "Expandir" });
  if (await expand.isVisible({ timeout: 2_000 }).catch(() => false)) await expand.click();
}

function tourPopover(page: import("@playwright/test").Page) {
  return page.locator(".driver-popover.agify-tour-popover");
}

test.describe("Tour guiado (onboarding)", () => {
  test("sem org (UI criar organizacao) nao dispara tour", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await page.goto("/boards");
    const createOrgHeading = page.getByRole("heading", { name: /Crie sua organizacao/i });
    const hasNoOrgUi = await createOrgHeading.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasNoOrgUi) {
      test.skip(
        true,
        "Seed sempre tem org — gate sem-org: Vitest canAutoStartTour/isTourAutoStartReady",
      );
      return;
    }
    await expect(tourPopover(page)).toBeHidden({ timeout: 4_000 });
    await expect(page.locator(".driver-popover")).toHaveCount(0);
  });

  test("com org: tour sobe na 1a visita e nao reabre apos dismiss", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);

    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 12_000 });
    await expect(popover).toContainText("Bem-vindo ao Agify");

    await popover.locator(".driver-popover-close-btn").click();
    await expect(popover).toBeHidden({ timeout: 5_000 });

    await page.reload();
    await expandSidebar(page);
    await expect(tourPopover(page)).toBeHidden({ timeout: 4_000 });
  });

  test("abre automaticamente na primeira visita", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);

    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await expect(popover).toContainText("Bem-vindo ao Agify");
  });

  test("fechar persiste e nao reabre automaticamente", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);

    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await popover.locator(".driver-popover-close-btn").click();
    await expect(popover).toBeHidden({ timeout: 5_000 });

    await page.reload();
    await expandSidebar(page);
    await expect(tourPopover(page)).toBeHidden({ timeout: 3_000 });
  });

  test("botao em Ajuda reabre o tour", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, "1");
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await loginAsStandard(page, { disableTours: false });
    await expandSidebar(page);
    await page.goto("/help");
    await expect(page.getByTestId("onboarding-tour-trigger")).toBeVisible();

    await page.getByTestId("onboarding-tour-trigger").click();
    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await expect(popover).toContainText("Bem-vindo ao Agify");
  });

  test("viewer sem permissao de carga nao mostra passo Carga", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, ONBOARDING_TOUR_COMPLETED_KEY);

    await loginAsViewer(page, { disableTours: false });
    await expandSidebar(page);

    const popover = tourPopover(page);
    await expect(popover).toBeVisible({ timeout: 10_000 });

    let sawWorkload = false;
    const maxSteps = 12;
    for (let i = 0; i < maxSteps; i++) {
      const text = (await popover.innerText()).toLowerCase();
      if (text.includes("carga")) {
        sawWorkload = true;
        break;
      }
      const next = popover.getByRole("button", { name: /Proximo|Comecar/i });
      if (!(await next.isVisible())) break;
      const label = await next.innerText();
      await next.click();
      if (label.toLowerCase().includes("comecar")) break;
    }

    expect(sawWorkload).toBe(false);
  });
});
