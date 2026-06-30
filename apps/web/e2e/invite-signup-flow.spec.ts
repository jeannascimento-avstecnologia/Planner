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

test("signup via convite aceita e persiste login", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-signup");
  await loginAsStandard(page);
  const invitePath = await createInviteLink(page, inviteEmail);

  await page.context().clearCookies();
  await page.goto(invitePath);
  await expect(page).toHaveURL(/\/login\?next=/);

  const signupHref = `/signup?next=${encodeURIComponent(invitePath.replace(/^https?:\/\/[^/]+/, ""))}`;
  await page.goto(signupHref);

  await page.getByLabel("Nome completo").fill("Convidado QA");
  await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);
  await page.getByLabel("Senha (8+ caracteres)").fill("password123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 20_000 });

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
});
