import { test, expect } from "@playwright/test";
import { loginAsStandard, uniqueEmail } from "./helpers";

async function createInviteFor(page: import("@playwright/test").Page, email: string): Promise<string> {
  await page.locator("ul.grid.grid-cols-1").getByRole("link", { name: /Roadmap/ }).click();
  await page.getByRole("button", { name: /Convidar/ }).click();
  await page.getByTestId("invite-email-input").fill(email);
  await page.getByTestId("invite-email-add").click();
  await page.getByTestId("invite-send").click();
  await expect(page.getByTestId("invite-link-url")).toBeVisible({ timeout: 15_000 });
  const href = await page.getByTestId("invite-link-url").getAttribute("href");
  if (!href) throw new Error("missing invite link");
  return href;
}

test("convite pendente: login com email correto aceita", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-pending");
  const password = "password123";

  await loginAsStandard(page);
  const invitePath = await createInviteFor(page, inviteEmail);
  const inviteRel = invitePath.replace(/^https?:\/\/[^/]+/, "");

  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Nome completo").fill("Conta Normal");
  await page.getByLabel("Nome da organizacao").fill("Org " + Date.now());
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha (8+ caracteres)").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 20_000 });

  await page.context().clearCookies();
  await page.goto(invitePath);
  await expect(page).toHaveURL(/\/login\?next=/, { timeout: 10_000 });

  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 20_000 });
  await expect(page.getByText(/Email diferente do convite|invalido ou expirado/i)).toHaveCount(0);
});

test("convite pendente: sessao admin e login na mesma aba mostra mismatch ate sair", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-admin-mix");
  const password = "password123";

  await loginAsStandard(page);
  const invitePath = await createInviteFor(page, inviteEmail);
  const inviteRel = invitePath.replace(/^https?:\/\/[^/]+/, "");

  const guestCtx = await page.context().browser()!.newContext();
  const guestPage = await guestCtx.newPage();
  await guestPage.goto("/signup");
  await guestPage.getByLabel("Nome completo").fill("Guest");
  await guestPage.getByLabel("Nome da organizacao").fill("GOrg " + Date.now());
  await guestPage.getByLabel("Email").fill(inviteEmail);
  await guestPage.getByLabel("Senha (8+ caracteres)").fill(password);
  await guestPage.getByRole("button", { name: "Criar conta" }).click();
  await expect(guestPage).toHaveURL(/\/boards/, { timeout: 20_000 });
  await guestCtx.close();

  await page.goto(invitePath);
  await expect(page.getByText(/Email diferente do convite/i)).toBeVisible({ timeout: 10_000 });

  await page.goto(`/login?next=${encodeURIComponent(inviteRel)}`);
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 20_000 });
});
