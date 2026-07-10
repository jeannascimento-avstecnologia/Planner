import { expect, test } from "@playwright/test";

function fakeJwt(): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: "58a57204-a6ba-4380-a70b-e75d2915bdc9",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.signature`;
}

test("credencial invalida fica na pagina sem Server Action ou excecao", async ({ page }) => {
  const pageErrors: string[] = [];
  const loginPosts: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/login") {
      loginPosts.push(request.url());
    }
  });

  await page.route("**/auth/v1/token?grant_type=password", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    }),
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Senha").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Email ou senha incorretos.")).toBeVisible();
  expect(loginPosts).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("login grava cookies SSR e navega por carregamento completo", async ({ page, context }) => {
  const pageErrors: string[] = [];
  const loginPosts: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/login") {
      loginPosts.push(request.url());
    }
  });

  const accessToken = fakeJwt();
  await page.route("**/auth/v1/token?grant_type=password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "test-refresh-token",
        user: {
          id: "58a57204-a6ba-4380-a70b-e75d2915bdc9",
          aud: "authenticated",
          role: "authenticated",
          email: "user@example.com",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    }),
  );
  await page.route((url) => url.pathname === "/help", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Help</h1>" }),
  );

  await page.goto("/login?next=/help");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Senha").fill("valid-password");
  await page.getByTestId("login-remember-me").click();
  await expect(page.getByTestId("login-remember-me")).toHaveAttribute("aria-checked", "false");
  const persistenceRequest = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/auth/persistence",
  );
  await page.getByRole("button", { name: "Entrar" }).click();

  const persistenceResponse = await persistenceRequest;
  expect(persistenceResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/help$/);
  const cookies = await context.cookies();
  const authCookies = cookies.filter((cookie) => /^sb-.+-auth-token/.test(cookie.name));
  expect(authCookies.length).toBeGreaterThan(0);
  expect(
    authCookies.every((cookie) => cookie.expires === -1),
    JSON.stringify(authCookies),
  ).toBe(true);
  expect(cookies.find((cookie) => cookie.name === "ngp-auth-persist")?.value).toBe("0");
  expect(loginPosts).toEqual([]);
  expect(pageErrors).toEqual([]);
});
