import { test, expect, type Page } from "@playwright/test";
import { KANBAN_DRAG_ACTIVATION_DELAY_MS } from "../lib/kanban-dnd";
import {
  dismissBlockingTour,
  expandBoardFilters,
  loginAsStandard,
  loginAsViewer,
  openSeedBoard,
} from "./helpers";

function brDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

async function openTimeline(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Linha do tempo" }).click();
  await expect(page.getByTestId("board-timeline-view")).toBeVisible({ timeout: 15_000 });
}

async function dragToCanvas(page: Page, source: ReturnType<Page["getByTestId"]>): Promise<void> {
  const canvas = page.getByTestId("timeline-canvas");
  await expect(canvas).toBeVisible();
  await source.hover();
  await page.mouse.down();
  await page.waitForTimeout(KANBAN_DRAG_ACTIVATION_DELAY_MS + 30);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("timeline canvas missing");
  await page.mouse.move(box.x + Math.min(160, box.width / 3), box.y + Math.min(40, box.height / 2), {
    steps: 12,
  });
  await page.mouse.up();
}

async function fillPeriodModal(page: Page, start: Date, end: Date): Promise<void> {
  const modal = page.getByTestId("timeline-period-modal");
  await expect(modal).toBeVisible({ timeout: 10_000 });
  const startInput = page.getByTestId("timeline-period-start").getByPlaceholder("DD.MM.AAAA");
  const endInput = page.getByTestId("timeline-period-end").getByPlaceholder("DD.MM.AAAA");
  await startInput.fill(brDate(start));
  await startInput.blur();
  await endInput.fill(brDate(end));
  await endInput.blur();
}

test.describe("Timeline redesign", () => {
  test.describe.configure({ timeout: 90_000 });

  test.describe("editor", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStandard(page);
    });

    test("agenda via drag do backlog, persiste apos reload", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      const title = "TL Agenda " + Date.now();
      const col = page.locator("section[data-testid^='kanban-column-']").first();
      await col.getByPlaceholder("Novo card").fill(title);
      await col.getByRole("button", { name: "Adicionar", exact: true }).click();
      await expect(col.getByRole("button", { name: title })).toBeVisible({ timeout: 15_000 });

      await openTimeline(page);
      const chip = page.getByTestId(/^timeline-backlog-/).filter({ hasText: title });
      await expect(chip).toBeVisible();
      await dragToCanvas(page, chip);
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 2);
      await fillPeriodModal(page, start, end);
      await page.getByTestId("timeline-period-save").click();
      await expect(page.getByTestId("timeline-period-modal")).toBeHidden({ timeout: 15_000 });
      await expect(page.locator(`[data-card-title="${title}"]`)).toBeVisible({ timeout: 15_000 });

      await page.reload();
      await openTimeline(page);
      await expect(page.locator(`[data-card-title="${title}"]`)).toBeVisible({ timeout: 15_000 });
    });

    test("reposicionar abre modal; cancelar nao escreve", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      const row = page.locator("[data-card-title='Configurar Supabase local']");
      await expect(row).toBeVisible();
      const bar = row.getByTestId(/^timeline-bar-/);
      const writes: string[] = [];
      page.on("request", (req) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method())) writes.push(req.url());
      });
      await dragToCanvas(page, bar);
      await expect(page.getByTestId("timeline-period-modal")).toBeVisible({ timeout: 10_000 });
      const before = writes.length;
      await page.getByTestId("timeline-period-cancel").click();
      await expect(page.getByTestId("timeline-period-modal")).toBeHidden();
      expect(writes.length).toBe(before);
    });

    test("resize da borda atualiza datas no drawer", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      const row = page.locator("[data-card-title='Configurar Supabase local']");
      const handle = row.getByTestId(/^timeline-resize-end-/);
      await expect(handle).toBeVisible();
      const box = await handle.boundingBox();
      if (!box) throw new Error("resize handle missing");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(KANBAN_DRAG_ACTIVATION_DELAY_MS + 20);
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await row.getByTestId(/^timeline-bar-/).click();
      const drawer = page.locator("aside").filter({ hasText: "Editar card" });
      await expect(drawer).toBeVisible({ timeout: 10_000 });
      await expect(drawer.getByPlaceholder("DD.MM.AAAA").last()).not.toHaveValue("");
    });

    test("zoom reescala ticks sem POST", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      const writes: string[] = [];
      page.on("request", (req) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method())) writes.push(req.url());
      });
      await page.getByTestId("timeline-zoom-day").click();
      const dayTicks = await page.getByTestId(/^timeline-tick-/).count();
      await page.getByTestId("timeline-zoom-month").click();
      const monthTicks = await page.getByTestId(/^timeline-tick-/).count();
      expect(dayTicks).toBeGreaterThan(monthTicks);
      expect(writes).toEqual([]);
      await expect(page.locator("[data-card-title='Configurar Supabase local']")).toBeVisible();
    });

    test("agrupamento reorganiza lanes sem escrita", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      const writes: string[] = [];
      page.on("request", (req) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method())) writes.push(req.url());
      });
      await page.getByTestId("timeline-group-column").click();
      await expect(page.getByTestId(/^timeline-lane-/).first()).toBeVisible();
      const colCount = await page.getByTestId(/^timeline-lane-/).count();
      expect(colCount).toBeGreaterThanOrEqual(2);
      await page.getByTestId("timeline-group-assignee").click();
      await expect(page.getByTestId(/^timeline-lane-/).first()).toBeVisible();
      await page.getByTestId("timeline-group-stage").click();
      await expect(page.getByTestId(/^timeline-lane-/).first()).toBeVisible();
      await page.getByTestId("timeline-group-tag").click();
      await expect(page.getByTestId(/^timeline-lane-/).first()).toBeVisible();
      expect(writes).toEqual([]);
    });

    test("filtro do CardFilterBar aplica antes do agrupamento", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      await expandBoardFilters(page);
      await page.getByRole("button", { name: "backend", exact: true }).click();
      await page.getByTestId("timeline-group-stage").click();
      await expect(page.locator("[data-card-title='RLS + pgTAP']")).toBeVisible();
      await expect(page.locator("[data-card-title='Walking skeleton de auth']")).toHaveCount(0);
    });

    test("dependencia finish-to-start aparece como seta", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      await page.getByTestId("timeline-group-column").click();
      await expect(page.getByTestId(/^timeline-dep-/)).not.toHaveCount(0);
      await page.getByTestId("timeline-zoom-day").click();
      await expect(page.getByTestId(/^timeline-dep-/)).not.toHaveCount(0);
    });

    test("inicio > fim bloqueia salvar", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      const title = "TL Invalid " + Date.now();
      const col = page.locator("section[data-testid^='kanban-column-']").first();
      await col.getByPlaceholder("Novo card").fill(title);
      await col.getByRole("button", { name: "Adicionar", exact: true }).click();
      await expect(col.getByRole("button", { name: title })).toBeVisible({ timeout: 15_000 });
      await openTimeline(page);
      const chip = page.getByTestId(/^timeline-backlog-/).filter({ hasText: title });
      await dragToCanvas(page, chip);
      const start = new Date();
      start.setDate(start.getDate() + 5);
      const end = new Date();
      await fillPeriodModal(page, start, end);
      await expect(page.getByTestId("timeline-period-error")).toBeVisible();
      await expect(page.getByTestId("timeline-period-save")).toBeDisabled();
    });

    test("zoom e agrupamento persistem na URL apos reload", async ({ page }) => {
      await openSeedBoard(page);
      await dismissBlockingTour(page);
      await openTimeline(page);
      await page.getByTestId("timeline-zoom-day").click();
      await page.getByTestId("timeline-group-column").click();
      await expect(page).toHaveURL(/timelineZoom=day/);
      await expect(page).toHaveURL(/timelineGroup=column/);
      await page.reload();
      await expect(page.getByTestId("board-timeline-view")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("timeline-zoom-day")).toHaveAttribute("aria-checked", "true");
      await expect(page.getByTestId("timeline-group-column")).toHaveAttribute("aria-checked", "true");
    });
  });

  test.describe("viewer", () => {
    test("sem drag/handles; barras visiveis", async ({ page }) => {
      await loginAsViewer(page);
      await openSeedBoard(page);
      await openTimeline(page);
      await expect(page.locator("[data-card-title='Configurar Supabase local']")).toBeVisible();
      await expect(page.getByTestId(/^timeline-resize-end-/)).toHaveCount(0);
    });
  });
});
