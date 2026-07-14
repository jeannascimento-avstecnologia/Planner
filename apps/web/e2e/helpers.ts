import { expect, type Page } from "@playwright/test";

export const STANDARD_USER = {
  email: "admin@nextgen.dev",
  password: "password123",
};

export const VIEWER_USER = {
  email: "viewer@nextgen.dev",
  password: "password123",
};

export const ORG_ADMIN_USER = {
  email: "orgadmin@nextgen.dev",
  password: "password123",
};

export const SEED_BOARD_ID = "33333333-3333-3333-3333-333333333333";

/** Tile de projeto na grade (modo hub usa botao). */
export function projectTile(page: Page, name?: RegExp | string) {
  const base = page.getByTestId("project-tile");
  if (name === undefined) return base;
  return base.filter({ hasText: name });
}

/** @deprecated use projectTile + open-project para hub */
export function projectLink(page: Page, name: RegExp | string) {
  return page.locator("ul.grid.grid-cols-1").getByRole("link", { name });
}

export async function openSeedBoard(page: Page): Promise<void> {
  await page.goto(`/boards/${SEED_BOARD_ID}`);
  await expect(page.getByRole("button", { name: "Walking skeleton de auth" })).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/** Impede auto-start de tours globais/pagina que bloqueiam cliques nos E2E. */
export async function disableToursForE2E(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("ngp:onboarding-tour-completed", "1");
    for (const id of [
      "home",
      "projects",
      "calendar",
      "plan",
      "workload",
      "settings",
      "help",
      "board-kanban",
    ]) {
      localStorage.setItem(`ngp:page-tour-completed:${id}`, "1");
    }
  });
}

/** Loga com o usuario padrao do seed e espera cair em /boards. */
export async function loginAsStandard(
  page: Page,
  options?: { disableTours?: boolean },
): Promise<void> {
  if (options?.disableTours !== false) {
    await disableToursForE2E(page);
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(STANDARD_USER.email);
  await page.getByLabel("Senha").fill(STANDARD_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await dismissBlockingTour(page);
}

/** Fecha tour global que bloqueia cliques na Home (nao altera localStorage). */
export async function dismissBlockingTour(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Bem-vindo ao Agify" });
  if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    return;
  }
  const driverClose = page.locator(".driver-popover-close-btn");
  if (await driverClose.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await driverClose.click();
  }
}

export async function loginAsViewer(
  page: Page,
  options?: { disableTours?: boolean },
): Promise<void> {
  if (options?.disableTours !== false) {
    await disableToursForE2E(page);
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(VIEWER_USER.email);
  await page.getByLabel("Senha").fill(VIEWER_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

export async function loginAsOrgAdmin(
  page: Page,
  options?: { disableTours?: boolean },
): Promise<void> {
  if (options?.disableTours !== false) {
    await disableToursForE2E(page);
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(ORG_ADMIN_USER.email);
  await page.getByLabel("Senha").fill(ORG_ADMIN_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/** Coleta erros de console do navegador para asserts de UX. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

export function uniqueEmail(prefix = "qa"): string {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@nextgen.dev`;
}

/** E2E roda contra .env.local — Supabase Docker local nao tem OAuth Azure. */
export function isLocalSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.includes("127.0.0.1") || url.includes("localhost:54321");
}

/** Abre drawer e define prazo via campo DD.MM.AAAA. */
export async function pickDueDateInDrawer(page: Page, daysFromToday: number): Promise<void> {
  const target = new Date();
  target.setDate(target.getDate() + daysFromToday);
  const dd = String(target.getDate()).padStart(2, "0");
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const yyyy = target.getFullYear();
  const drawer = page.locator("aside").filter({ hasText: "Editar card" });
  const dueInput = drawer.getByPlaceholder("DD.MM.AAAA").last();
  await dueInput.fill(`${dd}.${mm}.${yyyy}`);
  await dueInput.blur();
  await drawer.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Salvando...")).toBeHidden({ timeout: 15_000 });
}
