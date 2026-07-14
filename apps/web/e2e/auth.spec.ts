import { test, expect } from "@playwright/test";
import { STANDARD_USER, collectConsoleErrors, disableToursForE2E, dismissBlockingTour, uniqueEmail } from "./helpers";

test.describe("Auth", () => {
  test("login page renderiza campos e acoes", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/login");
    await expect(page.getByAltText("Agify")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
    const microsoftEnabled =
      (await page.getByTestId("oauth-sign-in-buttons").getAttribute("data-microsoft-enabled")) === "true";
    if (microsoftEnabled) {
      await expect(page.getByRole("button", { name: "Continuar com Microsoft" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Continuar com Microsoft" })).toHaveCount(0);
      await expect(page.getByTestId("microsoft-login-unavailable-hint")).toBeVisible();
    }
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Esqueci a senha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
    expect(consoleErrors.filter((e) => /Hydration|reading 'call'|is not defined/i.test(e))).toEqual([]);
  });

  test("login microsoft oauth permanece visivel apos hydration", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/login", { waitUntil: "networkidle" });
    const microsoftEnabled =
      (await page.getByTestId("oauth-sign-in-buttons").getAttribute("data-microsoft-enabled")) === "true";
    test.skip(!microsoftEnabled, "Microsoft OAuth desabilitado neste ambiente");
    const microsoft = page.getByRole("button", { name: "Continuar com Microsoft" });
    await expect(microsoft).toBeVisible();
    await expect(page.locator('[data-oauth-provider="microsoft"]')).toHaveAttribute(
      "href",
      /\/api\/auth\/oauth\/microsoft/,
    );
    await page.waitForTimeout(3000);
    await expect(microsoft).toBeVisible();
    await expect(page.locator('[data-oauth-provider="google"]')).toBeVisible();
    expect(consoleErrors.filter((e) => /Hydration|reading 'call'|is not defined/i.test(e))).toEqual([]);
  });

  test("api microsoft oauth bloqueia supabase local com mensagem legivel", async ({ page, request }) => {
    await page.goto("/login");
    const microsoftEnabled =
      (await page.getByTestId("oauth-sign-in-buttons").getAttribute("data-microsoft-enabled")) === "true";
    test.skip(microsoftEnabled, "Microsoft OAuth habilitado neste ambiente");
    const res = await request.get("/api/auth/oauth/microsoft", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers().location ?? "";
    expect(location).toMatch(/\/login\?error=/);
    expect(decodeURIComponent(location)).toMatch(/Supabase Cloud/i);
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
    const microsoftEnabled =
      (await page.getByTestId("oauth-sign-in-buttons").getAttribute("data-microsoft-enabled")) === "true";
    if (microsoftEnabled) {
      await expect(page.getByRole("button", { name: "Continuar com Microsoft" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Continuar com Microsoft" })).toHaveCount(0);
    }
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
    await disableToursForE2E(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill(STANDARD_USER.email);
    await page.getByLabel("Senha").fill(STANDARD_USER.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/boards/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await dismissBlockingTour(page);

    await page.getByTestId("sign-out-button").click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
