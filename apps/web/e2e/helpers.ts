import { expect, type Page } from "@playwright/test";

export const STANDARD_USER = {
  email: "admin@nextgen.dev",
  password: "password123",
};

export const SEED_BOARD_ID = "33333333-3333-3333-3333-333333333333";

/** Link do projeto na lista (nao confundir com tiles de prazo). */
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
