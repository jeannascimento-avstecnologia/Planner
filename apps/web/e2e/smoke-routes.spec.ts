import { test, expect } from "@playwright/test";
import {
  collectConsoleErrors,
  dismissBlockingTour,
  loginAsStandard,
  openSeedBoard,
  SEED_BOARD_ID,
} from "./helpers";

const FATAL_CONSOLE = /Hydration|reading 'call'|is not defined|ChunkLoadError/i;

type SmokeRoute = {
  path: string;
  assert: (page: import("@playwright/test").Page) => Promise<void>;
};

const ROUTES: SmokeRoute[] = [
  {
    path: "/boards",
    assert: async (page) => {
      await expect(page.getByRole("main").getByRole("heading", { name: "Home", exact: true })).toBeVisible();
    },
  },
  {
    path: "/projects",
    assert: async (page) => {
      await expect(page.getByTestId("projects-page")).toBeVisible();
    },
  },
  {
    path: "/calendar",
    assert: async (page) => {
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Calendario", { exact: false }).first()).toBeVisible();
    },
  },
  {
    path: "/workload",
    assert: async (page) => {
      await expect(page.getByTestId("workload-page")).toBeVisible();
    },
  },
  {
    path: "/plan",
    assert: async (page) => {
      await expect(page.getByTestId("plan-page")).toBeVisible({ timeout: 20_000 });
    },
  },
  {
    path: "/help",
    assert: async (page) => {
      await expect(page.getByTestId("help-page")).toBeVisible();
    },
  },
  {
    path: "/settings",
    assert: async (page) => {
      await expect(page.getByTestId("settings-hub-page")).toBeVisible();
    },
  },
  {
    path: "/settings/organizations",
    assert: async (page) => {
      await expect(page.getByTestId("organizations-hub-page")).toBeVisible();
    },
  },
  {
    path: "/settings/organization",
    assert: async (page) => {
      await expect(page.getByTestId("org-members-page")).toBeVisible();
    },
  },
  {
    path: "/settings/audit",
    assert: async (page) => {
      await expect(page.getByTestId("audit-log-page")).toBeVisible();
    },
  },
  {
    path: "/profile",
    assert: async (page) => {
      await expect(page.getByRole("main").getByRole("heading", { name: "Perfil" })).toBeVisible();
    },
  },
  {
    path: `/boards/${SEED_BOARD_ID}`,
    assert: async (page) => {
      await expect(page.getByRole("button", { name: "Walking skeleton de auth" })).toBeVisible({
        timeout: 15_000,
      });
    },
  },
  {
    path: `/boards/${SEED_BOARD_ID}/dashboard`,
    assert: async (page) => {
      await expect(page.getByTestId("board-dashboard-page")).toBeVisible();
    },
  },
  {
    path: `/boards/${SEED_BOARD_ID}/automations`,
    assert: async (page) => {
      await expect(page.getByTestId("automations-page")).toBeVisible();
    },
  },
];

test.describe("Smoke — rotas autenticadas", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  for (const route of ROUTES) {
    test(`GET ${route.path} renderiza sem crash`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await dismissBlockingTour(page);
      await route.assert(page);
      expect(consoleErrors.filter((e) => FATAL_CONSOLE.test(e)), consoleErrors.join("\n")).toEqual([]);
    });
  }

  test("login publico renderiza sem crash", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    expect(consoleErrors.filter((e) => FATAL_CONSOLE.test(e))).toEqual([]);
  });

  test("navegacao board -> home via sidebar", async ({ page }) => {
    await openSeedBoard(page);
    await dismissBlockingTour(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    const expand = page.getByRole("button", { name: "Expandir" });
    if (await expand.isVisible({ timeout: 2_000 }).catch(() => false)) await expand.click();
    await page.locator("aside.aurora-sidebar-gradient").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/boards$/, { timeout: 20_000 });
  });
});
