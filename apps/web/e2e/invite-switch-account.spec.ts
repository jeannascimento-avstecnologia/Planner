import { test, expect } from "@playwright/test";
import { STANDARD_USER } from "./helpers";

test("convite invalido: entrar com outra conta encerra sessao e vai ao login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(STANDARD_USER.email);
  await page.getByLabel("Senha").fill(STANDARD_USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });

  await page.goto("/invite?token=invalid-expired-token");
  await expect(page.getByText(/Convite invalido ou expirado/i)).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Entrar com outra conta" }).click();
  await expect(page).toHaveURL(/\/login\?next=/, { timeout: 10_000 });

  await page.goto("/boards");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
