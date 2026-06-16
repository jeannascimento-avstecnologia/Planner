import { test, expect } from "@playwright/test";
import { loginAsStandard, openSeedBoard, projectLink } from "./helpers";

test.describe("UI v2 — sidebar, tema, share, filtros, aparencia", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("home mostra tiles de prazo em grid", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Proximos prazos" });
    await expect(section).toBeVisible();
    const tiles = section.locator("ul.grid a");
    const count = await tiles.count();
    if (count > 0) {
      await expect(tiles.first()).toHaveClass(/aspect-square/);
    }
  });

  test("sidebar inicia recolhida e expande via seta", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText("NextGen Planner")).toBeHidden();
    await expect(page.getByRole("button", { name: "Expandir" })).toBeVisible();
    await page.getByRole("button", { name: "Expandir" }).click();
    await expect(page.getByText("NextGen Planner")).toBeVisible();
    await expect(page.getByRole("button", { name: "Recolher" })).toBeVisible();
  });

  test("sidebar tem calendario como icone (sem grade) e sem compartilhar", async ({ page }) => {
    const aside = page.locator("aside").first();
    await expect(aside.getByRole("link", { name: "Calendario" })).toBeVisible();
    await expect(aside.getByText("Dom", { exact: true })).toHaveCount(0);
    await expect(aside.getByRole("button", { name: "Copiar link do projeto" })).toHaveCount(0);
  });

  test("theme toggle alterna data-theme", async ({ page }) => {
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: /Tema (escuro|claro)/ }).click();
    await expect(async () => {
      expect(await html.getAttribute("data-theme")).not.toBe(before);
    }).toPass();
  });

  test("sino de notificacoes lista prazos proximos", async ({ page }) => {
    const bell = page.getByRole("button", { name: "Notificacoes" });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText("Prazo se aproximando").first()).toBeVisible();
  });

  test("compartilhar abre modal dentro do board", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Compartilhar" }).click();
    await expect(page.getByRole("heading", { name: /Compartilhar/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar link do projeto" })).toBeVisible();
  });

  test("home: card de projeto mostra icone e cor customizada", async ({ page }) => {
    const link = projectLink(page, /Roadmap/);
    await expect(link.locator("svg")).toBeVisible();
    await expect(link).toHaveAttribute("style", /border-left/i);
  });

  test("filtro por marcador reduz cards visiveis", async ({ page }) => {
    await openSeedBoard(page);
    await expect(page.getByText("Walking skeleton de auth")).toBeVisible();
    await page.getByRole("button", { name: "backend", exact: true }).click();
    await expect(page.getByText("Walking skeleton de auth")).toBeHidden();
    await expect(page.getByText("RLS + pgTAP")).toBeVisible();
  });

  test("filtro por prazo 3d esconde cards distantes", async ({ page }) => {
    await openSeedBoard(page);
    await expect(page.getByText("Walking skeleton de auth")).toBeVisible();
    await page.getByRole("button", { name: "3d", exact: true }).click();
    await expect(page.getByText("Walking skeleton de auth")).toBeHidden();
    await expect(page.getByText("RLS + pgTAP")).toBeVisible();
  });

  test("date picker abre mini calendario ao clicar", async ({ page }) => {
    await openSeedBoard(page);
    const todo = page.locator("section").filter({
      has: page.getByRole("heading", { name: "To Do", exact: true }),
    });
    await expect(todo.locator('input[type="date"]')).toHaveCount(0);
    await todo.getByRole("button", { name: /Adicionar prazo/i }).click();
    await expect(todo.getByRole("button", { name: "Mes anterior" })).toBeVisible();
  });

  test("card drawer tag popover abre com +", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: /Walking skeleton de auth/i }).first().click();
    await page.getByRole("button", { name: "Adicionar marcador" }).click();
    await expect(page.getByRole("textbox", { name: "Novo", exact: true })).toBeVisible();
  });

  test("perfil salva idioma e telefone", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
    await page.getByPlaceholder("+55 ...").fill("+55 11 99999-0000");
    await page.getByRole("button", { name: /Salvar alteracoes/ }).click();
    await expect(page.getByText("Perfil atualizado!")).toBeVisible({ timeout: 15_000 });
  });

  test("calendario clique em dia abre agenda", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/calendar/);
    const calendarGrid = page.locator("section").filter({ hasText: "Dom" }).first();
    await calendarGrid.locator("button").last().click();
    await expect(page.getByRole("heading", { name: /Agenda/i })).toBeVisible({ timeout: 10_000 });
  });

  test("board aplica tema escopado pela cor do projeto", async ({ page }) => {
    await openSeedBoard(page);
    const scope = page.locator(".board-theme-scope");
    await expect(scope).toBeVisible();
    const accent = await scope.evaluate((el) => getComputedStyle(el).getPropertyValue("--board-accent").trim());
    expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("botao Adicionar do kanban usa bg-board-accent", async ({ page }) => {
    await openSeedBoard(page);
    const todo = page.locator("section").filter({
      has: page.getByRole("heading", { name: "To Do", exact: true }),
    });
    await expect(todo.getByRole("button", { name: "Adicionar", exact: true })).toHaveClass(/bg-board-accent/);
  });

  test("sidebar fica fora do board-theme-scope", async ({ page }) => {
    await openSeedBoard(page);
    await expect(page.locator("aside").first().locator(".board-theme-scope")).toHaveCount(0);
    await expect(page.locator(".board-theme-scope")).toBeVisible();
  });
});
