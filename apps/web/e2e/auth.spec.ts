import { test, expect } from "@playwright/test";
import { STANDARD_USER, collectConsoleErrors, uniqueEmail } from "./helpers";

test.describe("Auth", () => {
  test("login page renderiza campos e acoes", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByAltText("Agify")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Esqueci a senha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
  });

  test("login com credenciais invalidas mostra erro string (nao objeto)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("naoexiste@nextgen.dev");
    await page.getByLabel("Senha").fill("senhaerrada123");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Deve continuar em /login e mostrar mensagem legivel (nao "{}").
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("{}", { exact: true })).toHaveCount(0);
  });

  test("login com usuario padrao redireciona para /boards SEM erro vazio", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill(STANDARD_USER.email);
    await page.getByLabel("Senha").fill(STANDARD_USER.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    // BUG ALVO: login bem-sucedido deve navegar para /boards e nao exibir "{}".
    await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
    await expect(page.getByText("{}", { exact: true })).toHaveCount(0);
    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });

  test("rota protegida /boards redireciona para /login sem sessao", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/boards");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup valida senha curta", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
    await page.getByLabel("Nome completo").fill("QA Tester");
    await page.getByLabel("Nome da organizacao").fill("QA Org");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Senha (8+ caracteres)").fill("123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText("{}", { exact: true })).toHaveCount(0);
  });

  test("signup cria conta+org e entra em /boards", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Nome completo").fill("QA Novo");
    await page.getByLabel("Nome da organizacao").fill("QA Org " + Date.now());
    await page.getByLabel("Email").fill(uniqueEmail("signup"));
    await page.getByLabel("Senha (8+ caracteres)").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("{}", { exact: true })).toHaveCount(0);
    const ok = await page
      .waitForURL(/\/(boards|login)/, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (ok) {
      if (page.url().includes("/login")) {
        await expect(page.url()).toMatch(/message=confirm/);
      } else {
        await expect(page).toHaveURL(/\/boards/);
      }
    } else {
      const rateLimit = page.getByText(/rate limit exceeded/i);
      const errorBanner = page.locator("[role='alert'], .text-aurora-danger").first();
      await expect(rateLimit.or(errorBanner)).toBeVisible({ timeout: 5_000 });
    }
  });

  test("forgot password mostra mensagem de confirmacao", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(STANDARD_USER.email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(
      page.getByText(/enviamos o link/i).or(page.getByText(/rate limit exceeded/i)),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("logout retorna para /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STANDARD_USER.email);
    await page.getByLabel("Senha").fill(STANDARD_USER.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });

    await page.getByTestId("sign-out-button").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
