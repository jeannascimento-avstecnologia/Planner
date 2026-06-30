import { test, expect } from "@playwright/test";
import { loginAsStandard, uniqueEmail } from "./helpers";

async function createInviteLink(page: import("@playwright/test").Page, email: string): Promise<string> {
  await page.locator("ul.grid.grid-cols-1").getByRole("link", { name: /Roadmap/ }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/);
  await page.getByRole("button", { name: /Convidar um integrante/i }).click();
  await page.getByTestId("invite-email-input").fill(email);
  await page.getByTestId("invite-email-add").click();
  await page.getByTestId("invite-send").click();
  await expect(page.getByTestId("invite-link-url")).toBeVisible({ timeout: 15_000 });
  const href = await page.getByTestId("invite-link-url").getAttribute("href");
  if (!href) throw new Error("invite link missing");
  return href;
}

test("convite: login com email convidado existente aceita", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-existing");
  const password = "password123";

  await loginAsStandard(page);
  const invitePath = await createInviteLink(page, inviteEmail);
  const inviteRel = invitePath.replace(/^https?:\/\/[^/]+/, "");

  await page.context().clearCookies();
  await page.goto(`/signup?next=${encodeURIComponent(inviteRel)}`);
  await page.getByLabel("Nome completo").fill("Usuario Existente");
  await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);
  await page.getByLabel("Senha (8+ caracteres)").fill(password);
  await page.getByRole("button", { name: /Criar conta/i }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 25_000 });

  await page.context().clearCookies();
  await page.goto(invitePath);
  await expect(page).toHaveURL(/\/login\?next=/, { timeout: 10_000 });

  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 20_000 });
  await expect(page.getByText(/outro email|nao deveria estar vendo esta tela/i)).toHaveCount(0);
});

test("convite: admin abre link e login sem sair mostra mismatch", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-admin-stale");
  const password = "password123";

  await loginAsStandard(page);
  const invitePath = await createInviteLink(page, inviteEmail);

  await page.goto(`/signup?next=${encodeURIComponent(invitePath.replace(/^https?:\/\/[^/]+/, ""))}`);
  await page.getByLabel("Nome completo").fill("Convidado");
  await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);
  await page.getByLabel("Senha (8+ caracteres)").fill(password);
  await page.getByRole("button", { name: /Criar conta/i }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 25_000 });

  await loginAsStandard(page);
  await page.goto(invitePath);
  await expect(page.getByText(/nao deveria estar vendo esta tela/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/login");
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });

  await page.goto(invitePath);
  const mismatch = await page.getByText(/nao deveria estar vendo esta tela/i).isVisible().catch(() => false);
  const accepted = page.url().match(/\/boards\/[0-9a-f-]+/);
  expect(mismatch && !accepted).toBeTruthy();
});
