import { test, expect } from "@playwright/test";
import { loginAsStandard } from "./helpers";

const STUB_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test.describe("Debug report", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((png) => {
      Object.assign(window, { __NGP_DEBUG_SCREENSHOT__: png });
    }, STUB_PNG);
    await loginAsStandard(page);
  });

  async function expandSidebar(page: import("@playwright/test").Page) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible()) await expand.click();
  }

  test("botao na sidebar abre modal e envia via POST interceptado", async ({ page }) => {
    await expandSidebar(page);
    await expect(page.getByTestId("sidebar-debug-report")).toBeVisible();

    const posts: string[] = [];
    await page.route("**/api/debug-reports", async (route) => {
      posts.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { success: true } }),
      });
    });

    await page.getByTestId("sidebar-debug-report").click();
    await expect(page.getByTestId("debug-report-dialog")).toBeVisible();
    await expect(page.getByTestId("debug-report-screenshot")).toBeVisible();

    await page.getByTestId("debug-report-title").fill("Barra sumiu");
    await page.getByTestId("debug-report-description").fill("Ao abrir a timeline a barra nao aparece.");
    await page.getByTestId("debug-report-submit").click();

    await expect.poll(() => posts.length).toBe(1);
    const payload = JSON.parse(posts[0] ?? "{}") as {
      title: string;
      clientMeta: { app: string };
    };
    expect(payload.title).toBe("Barra sumiu");
    expect(payload.clientMeta.app).toBe("planner-web");
    await expect(page.getByText("Relatório enviado. Obrigado!")).toBeVisible();
  });

  test("atalho Ctrl+Shift+D abre o modal", async ({ page }) => {
    await page.keyboard.press("Control+Shift+D");
    await expect(page.getByTestId("debug-report-dialog")).toBeVisible({ timeout: 10_000 });
  });
});
