import { test, expect } from "@playwright/test";
import { loginAsStandard, openSeedBoard, pickDueDateInDrawer, projectTile } from "./helpers";

test.describe("UI v2 — sidebar, tema, share, filtros, aparencia", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("home mostra faixa de 7 dias e prazos compactos", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Proximos 7 dias" });
    await expect(section).toBeVisible();
    await expect(section.locator(".grid.grid-cols-7 > div")).toHaveCount(7);
    await expect(section.getByText("Prazos")).toBeVisible();
  });

  test("sidebar inicia recolhida e expande via seta", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByAltText("Agify")).toBeVisible();
    await page.getByRole("button", { name: "Expandir" }).click();
    await expect(page.getByRole("button", { name: "Recolher" })).toBeVisible();
    await expect(page.getByAltText("Agify")).toBeVisible();
  });

  test("top bar mostra marca Agify central", async ({ page }) => {
    const topbar = page.locator("header.aurora-topbar-solid");
    await expect(topbar).toBeVisible();
    await expect(topbar.getByAltText("Agify")).toBeVisible();
    await expect(topbar.locator("span.rounded-full").filter({ hasText: "Home" })).toBeVisible();
  });

  test("sino na top bar tem fundo branco", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Notificacoes" })).toHaveClass(/bg-white/);
  });

  test("top bar nao usa textura listrada", async ({ page }) => {
    await expect(page.locator("header.aurora-topbar-pattern")).toHaveCount(0);
  });

  test("sidebar usa gradiente leve roxo-azul", async ({ page }) => {
    await expect(page.locator("aside.aurora-sidebar-gradient")).toBeVisible();
  });

  test("sidebar home primeiro depois calendario e projetos", async ({ page }) => {
    const nav = page.locator("aside nav");
    const links = nav.locator("a");
    await expect(links.nth(0)).toHaveAttribute("title", "Home");
    await expect(links.nth(1)).toHaveAttribute("title", "Calendario");
    await expect(links.nth(2)).toHaveAttribute("title", "Projetos");
  });

  test("logo colapsada expande sidebar ao clicar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByAltText("Agify")).toBeVisible();
    await page.getByRole("button", { name: "Expandir menu" }).click();
    await expect(page.getByRole("button", { name: "Recolher" })).toBeVisible();
  });

  test("logo sidebar visivel na sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator("aside").getByAltText("Agify")).toBeVisible();
  });

  test("top bar no board mostra pill com modo Kanban", async ({ page }) => {
    await openSeedBoard(page);
    await expect(
      page.locator("header.aurora-topbar-solid").locator("span.rounded-full").filter({ hasText: "Kanban" }),
    ).toBeVisible();
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

  test("dark mode sidebar usa fundo navy", async ({ page }) => {
    await page.locator("html").evaluate((el) => {
      el.dataset.theme = "dark";
    });
    const aside = page.locator("aside").first();
    const bg = await aside.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("sino de notificacoes na top bar lista prazos", async ({ page }) => {
    const topbar = page.locator("header.aurora-topbar-solid");
    const bell = topbar.getByRole("button", { name: "Notificacoes" });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText("Prazo se aproximando").first()).toBeVisible();
  });

  test("compartilhar abre modal dentro do board", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: "Compartilhar" }).click();
    await expect(page.getByRole("heading", { name: /Compartilhar/ })).toBeVisible();
    await expect(page.locator(".aurora-overlay")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar link do projeto" })).toBeVisible();
  });

  test("home: card de projeto mostra icone e cor customizada", async ({ page }) => {
    const tile = projectTile(page, /Roadmap/).getByRole("link");
    await expect(tile.locator("svg")).toBeVisible();
    await expect(tile).toHaveAttribute("style", /border-left/i);
  });

  test("faixa 7 dias mostra entregas com cor do projeto", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Proximos 7 dias" });
    const colored = section.locator(".grid.grid-cols-7 a[style*='background']");
    await expect(colored.first()).toBeVisible({ timeout: 10_000 });
  });

  test("icon picker inclui icones de TI", async ({ page }) => {
    await page.getByRole("button", { name: "Escolher icone" }).click();
    await expect(page.getByRole("button", { name: "network", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "firewall", exact: true })).toBeVisible();
  });

  test("color picker arco-iris visivel ao criar projeto", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Cor personalizada" })).toBeVisible();
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
    await page.getByRole("button", { name: /RLS \+ pgTAP/i }).first().click();
    await pickDueDateInDrawer(page, 1);
    await page.getByRole("button", { name: "Fechar" }).click();
    await page.getByRole("button", { name: /Walking skeleton de auth/i }).first().click();
    await pickDueDateInDrawer(page, 10);
    await page.getByRole("button", { name: "Fechar" }).click();
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
    await expect(page.getByRole("button", { name: "Mes anterior" })).toBeVisible();
  });

  test("card drawer tag popover abre com +", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: /Walking skeleton de auth/i }).first().click();
    await page.getByRole("button", { name: "Adicionar marcador" }).click();
    await expect(page.getByRole("textbox", { name: "Nome do marcador" })).toBeVisible();
  });

  test("criar marcador e anexa ao card", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: /Walking skeleton de auth/i }).first().click();
    await page.getByRole("button", { name: "Adicionar marcador" }).click();
    const tagName = `e2e-tag-${Date.now()}`;
    await page.getByRole("textbox", { name: "Nome do marcador" }).fill(tagName);
    await page.getByRole("textbox", { name: "Nome do marcador" }).press("Enter");
    const drawer = page.locator("aside").filter({ hasText: "Editar card" });
    await expect(drawer.getByText(tagName)).toBeVisible({ timeout: 15_000 });
  });

  test("datepicker no drawer visivel sem scroll", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: /Walking skeleton de auth/i }).first().click();
    const drawer = page.locator("aside").filter({ hasText: "Editar card" });
    await drawer.getByRole("button", { name: /Prazo:|Adicionar prazo/i }).click();
    const cal = page.getByRole("dialog", { name: "Calendario" });
    await expect(cal).toBeVisible();
    const box = await cal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(800 + 2);
    }
  });

  test("perfil salva idioma e telefone", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("main").getByRole("heading", { name: "Perfil" })).toBeVisible();
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
  test("perfil usa fundo solido aurora-bg", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator(".bg-aurora-bg").first()).toBeVisible();
  });

  test("datepicker aceita data digitada DD.MM.AAAA", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByRole("button", { name: /Walking skeleton/ }).click();
    const dueInput = page.getByPlaceholder("DD.MM.AAAA").last();
    await dueInput.fill("25.12.2026");
    await dueInput.blur();
    await expect(dueInput).toHaveValue("25.12.2026");
  });

  test("projeto exibe engrenagem de configuracoes no hover", async ({ page }) => {
    await page.getByRole("button", { name: "Grade" }).click();
    const tile = projectTile(page, /Roadmap/);
    await tile.hover();
    await expect(page.getByTestId("project-settings").first()).toBeVisible();
  });

  test("card no kanban exibe botoes Tiflux e abre modal criar", async ({ page }) => {
    await openSeedBoard(page);
    const todo = page.locator("section").filter({
      has: page.getByRole("heading", { name: "To Do", exact: true }),
    });
    const card = todo.getByRole("button", { name: /Walking skeleton de auth/i }).first();
    await expect(card).toBeVisible();
    const tifluxBtn = todo.getByTestId("tiflux-card-create").first();
    await expect(tifluxBtn).toBeVisible({ timeout: 15_000 });
    await tifluxBtn.click();
    await expect(page.getByTestId("tiflux-ticket-modal")).toBeVisible();
    await expect(page.getByLabel("Empresa")).toBeVisible();
    await expect(page.getByLabel("Mesa")).toBeVisible();
    await expect(page.getByLabel("Solicitante", { exact: true })).toBeVisible();
  });
});

test.describe("Auth Agify layout", () => {
  test("login com fundo navy e card surface", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main.aurora-sidebar-pattern")).toBeVisible();
    await expect(page.locator("main.aurora-sidebar-pattern > .auth-card")).toBeVisible();
    await expect(page.getByAltText("Agify")).toBeVisible();
    await expect(page.locator(".bg-black")).toHaveCount(0);
    await expect(page.getByText("ou", { exact: true })).toBeVisible();
  });
});
