import { test, expect } from "@playwright/test";
import { loginAsStandard, projectLink } from "./helpers";

async function openRoadmapBoard(page: import("@playwright/test").Page) {
  await projectLink(page, /Roadmap/).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/);
  await expect(page.getByRole("button", { name: /Convidar um integrante/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Board invites", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  test("modal de convite exibe secao de email para org admin", async ({ page }) => {
    await openRoadmapBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();
    await expect(page.getByTestId("invite-members-modal")).toBeVisible();
    await expect(page.getByTestId("invite-emails-section")).toBeVisible();
    await expect(page.getByTestId("invite-email-input")).toBeVisible();
    await expect(page.getByTestId("invite-email-add")).toBeVisible();
  });

  test("adiciona email na lista antes de enviar", async ({ page }) => {
    await openRoadmapBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();

    const email = `invite-qa-${Date.now()}@nextgen.dev`;
    await page.getByTestId("invite-email-input").fill(email);
    await page.getByTestId("invite-email-add").click();

    await expect(page.getByTestId("invite-email-list")).toContainText(email);
    await expect(page.getByTestId("invite-send")).toBeEnabled();
  });

  test("enviar convite exibe link copiavel", async ({ page }) => {
    await openRoadmapBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();

    const email = `invite-send-${Date.now()}@nextgen.dev`;
    await page.getByTestId("invite-email-input").fill(email);
    await page.getByTestId("invite-email-add").click();
    await page.getByTestId("invite-send").click();

    await expect(page.getByTestId("invite-link-url")).toBeVisible({ timeout: 15_000 });
    const href = await page.getByTestId("invite-link-url").getAttribute("href");
    expect(href).toMatch(/\/invite\?token=/);
  });

  test("visitante sem sessao e redirecionado ao login com next", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/invite?token=e2e-test-token");

    await expect(page).toHaveURL(/\/login\?next=/);
    expect(page.url()).toContain(encodeURIComponent("/invite?token=e2e-test-token"));
  });

  test("login com next preserva rota de convite no formulario", async ({ page }) => {
    const next = encodeURIComponent("/invite?token=e2e-form-token");
    await page.goto(`/login?next=${next}`);
    await expect(page.locator('form input[name="next"]').first()).toHaveValue("/invite?token=e2e-form-token");
  });

  test("botao engrenagem abre modal de gerenciamento de acesso", async ({ page }) => {
    await openRoadmapBoard(page);
    await page.getByTestId("board-access-button").click();
    await expect(page.getByTestId("board-access-modal")).toBeVisible();
    await expect(page.getByTestId("board-members-list")).toBeVisible();
    await expect(page.getByTestId("invite-emails-section")).not.toBeVisible();
  });

  test("gerente remove membro do projeto com confirmacao", async ({ page, browser }) => {
    const inviteEmail = `remove-member-${Date.now()}@nextgen.dev`;
    const memberName = `Membro Removivel ${Date.now()}`;
    const password = "password123";

    await openRoadmapBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();
    await page.getByTestId("invite-email-input").fill(inviteEmail);
    await page.getByTestId("invite-email-add").click();
    await page.getByTestId("invite-send").click();
    await expect(page.getByTestId("invite-link-url")).toBeVisible({ timeout: 15_000 });
    const invitePath = (await page.getByTestId("invite-link-url").getAttribute("href"))!;
    const inviteRel = invitePath.replace(/^https?:\/\/[^/]+/, "");

    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto(`/signup?next=${encodeURIComponent(inviteRel)}`);
    await guestPage.getByLabel("Nome completo").fill(memberName);
    await expect(guestPage.getByLabel("Email")).toHaveValue(inviteEmail);
    await guestPage.getByLabel("Senha (8+ caracteres)").fill(password);
    await guestPage.getByRole("button", { name: /Criar conta/i }).click();
    await expect(guestPage).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 25_000 });
    await guestCtx.close();

    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByTestId("invite-members-modal")).not.toBeVisible();
    await page.reload();
    await expect(page.getByTestId("board-access-button")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("board-access-button").click();
    await expect(page.getByTestId("board-access-modal")).toBeVisible();
    await expect(page.getByTestId("board-members-list")).toContainText(memberName);

    const memberRow = page.getByTestId("board-members-list").locator("li").filter({ hasText: memberName });
    const removeBtn = memberRow.getByRole("button", { name: /Remover/i });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/Remover acesso ao projeto/i)).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remover" }).click();

    await expect(page.getByTestId("board-members-list")).not.toContainText(memberName, {
      timeout: 10_000,
    });
  });
});

test.describe("Board invites — link de convite", () => {
  test("link gerado contem rota /invite com token", async ({ page }) => {
    await loginAsStandard(page);
    await openRoadmapBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();

    await page.getByTestId("invite-email-input").fill("admin@nextgen.dev");
    await page.getByTestId("invite-email-add").click();
    await page.getByTestId("invite-send").click();

    await expect(page.getByTestId("invite-link-url")).toBeVisible({ timeout: 15_000 });
    const href = await page.getByTestId("invite-link-url").getAttribute("href");
    expect(href).toMatch(/\/invite\?token=[a-f0-9]+/);
  });
});
