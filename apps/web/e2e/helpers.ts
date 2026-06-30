import { expect, type Page } from "@playwright/test";

export const STANDARD_USER = {
  email: "admin@nextgen.dev",
  password: "password123",
};

export const VIEWER_USER = {
  email: "viewer@nextgen.dev",
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
  await expect(page.getByRole("heading", { name: "To Do", exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Loga com o usuario padrao do seed e espera cair em /boards. */
export async function loginAsStandard(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(STANDARD_USER.email);
  await page.getByLabel("Senha").fill(STANDARD_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
}

export async function loginAsViewer(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(VIEWER_USER.email);
  await page.getByLabel("Senha").fill(VIEWER_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
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
