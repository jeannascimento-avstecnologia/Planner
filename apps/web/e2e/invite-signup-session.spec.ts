import { test, expect } from "@playwright/test";
import { loginAsStandard, uniqueEmail } from "./helpers";

test("signup com sessao ativa cria conta convidada apos signout automatico", async ({ page }) => {
  const inviteEmail = uniqueEmail("invite-blocked");
  await loginAsStandard(page);

  const next = `/invite?token=fake-token-for-signup-test`;
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);

  await expect(page.getByText(/Crie sua conta para entrar/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Nome da organizacao")).toHaveCount(0);

  await page.getByLabel("Nome completo").fill("Convidado");
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha (8+ caracteres)").fill("password123");
  await page.getByRole("button", { name: /Criar conta/i }).click();

  await expect(page).toHaveURL(/\/invite\?token=/, { timeout: 20_000 });

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Senha").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
});
