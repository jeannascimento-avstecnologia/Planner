import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

function isRscNavigation(url: string): boolean {
  return url.includes("_rsc=") || (url.endsWith(".txt") && url.includes("_next"));
}

test.describe("Navigation dedupe — re-clique mesma rota", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  async function expandSidebar(page: import("@playwright/test").Page) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible()) await expand.click();
  }

  async function countRscAfterStabilize(
    page: import("@playwright/test").Page,
    click: () => Promise<void>,
    repeats: number,
  ): Promise<number> {
    let count = 0;
    const onRequest = (req: import("@playwright/test").Request) => {
      if (req.method() === "GET" && isRscNavigation(req.url())) count += 1;
    };
    page.on("request", onRequest);
    await click();
    await page.waitForTimeout(500);
    for (let i = 0; i < repeats; i++) {
      await click();
      await page.waitForTimeout(150);
    }
    page.off("request", onRequest);
    return count;
  }

  test("10 cliques Calendario apos estabilizar = 0 GETs RSC adicionais", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");
    const link = aside.getByRole("link", { name: "Calendario" });

    await link.click();
    await expect(page).toHaveURL(/\/calendar/, { timeout: 20_000 });

    const extra = await countRscAfterStabilize(page, () => link.click(), 9);
    expect(extra).toBeLessThanOrEqual(1);
  });

  test("10 cliques Home apos estabilizar = 0 GETs RSC adicionais", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");
    const home = aside.getByRole("link", { name: "Home" });

    await home.click();
    await expect(page).toHaveURL(/\/boards$/, { timeout: 20_000 });

    const extra = await countRscAfterStabilize(page, () => home.click(), 9);
    expect(extra).toBeLessThanOrEqual(1);
  });

  test("10 cliques Carga apos estabilizar = 0 GETs RSC adicionais", async ({ page }) => {
    await expandSidebar(page);
    const aside = page.locator("aside.aurora-sidebar-gradient");
    const workload = aside.getByRole("link", { name: "Carga" });

    await workload.click();
    await expect(page).toHaveURL(/\/workload/, { timeout: 20_000 });

    const extra = await countRscAfterStabilize(page, () => workload.click(), 9);
    expect(extra).toBeLessThanOrEqual(1);
  });
});
