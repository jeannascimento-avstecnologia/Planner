import { test, expect } from "@playwright/test";
import { loginAsStandard, loginAsViewer, loginAsOrgAdmin } from "./helpers";

/** Abre o primeiro projeto visivel (Home grade Link ou hub select). Nao depende do seed Roadmap. */
async function openFirstBoard(page: import("@playwright/test").Page) {
  const tile = page.getByTestId("project-tile").first();
  await expect(tile).toBeVisible({ timeout: 15_000 });
  const link = tile.locator("a").first();
  if ((await link.count()) > 0) {
    await link.click();
  } else {
    await tile.getByTestId("project-tile-select").click();
    await page.getByTestId("open-project").click();
  }
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+/, { timeout: 15_000 });
}

test.describe("Access presets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandard(page);
  });

  // T1 — create custom preset (seed admin@ = owner)
  test("T1 settings: owner cria preset custom", async ({ page }) => {
    await page.goto("/settings/access-presets");
    await expect(page.getByTestId("access-presets-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("access-presets-new")).toBeVisible();
    await expect(page.getByText("Administrador").first()).toBeVisible();
    await expect(page.getByText("Editor").first()).toBeVisible();
    await expect(page.getByText("Visualizador").first()).toBeVisible();

    const name = `E2E Operacao ${Date.now()}`;
    await page.getByTestId("access-presets-new").click();
    await expect(page.getByTestId("access-preset-drawer")).toBeVisible();
    await page.getByTestId("access-preset-name").fill(name);
    await page.getByTestId("preset-shortcut-admin").click();
    await page.getByTestId("access-preset-save").click();
    await expect(page.getByTestId("access-preset-drawer")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });

  test("settings: excluir preset exige digitar excluir", async ({ page }) => {
    await page.goto("/settings/access-presets");
    await expect(page.getByTestId("access-presets-page")).toBeVisible({ timeout: 15_000 });

    const name = `E2E Delete ${Date.now()}`;
    await page.getByTestId("access-presets-new").click();
    await page.getByTestId("access-preset-name").fill(name);
    await page.getByTestId("preset-shortcut-viewer").click();
    await page.getByTestId("access-preset-save").click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });

    const row = page.locator("[data-testid^='access-preset-row-']").filter({ hasText: name });
    await row.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByTestId("access-preset-delete-confirm-input")).toBeVisible();
    await expect(page.getByTestId("access-preset-delete-confirm")).toBeDisabled();
    await page.getByTestId("access-preset-delete-confirm-input").fill("excluir");
    await expect(page.getByTestId("access-preset-delete-confirm")).toBeEnabled();
    await page.getByTestId("access-preset-delete-confirm").click();
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 15_000 });
  });

  // T9 — select-all / clear
  test("T9 settings: checklist com select-all no fim do grupo", async ({ page }) => {
    await page.goto("/settings/access-presets");
    await expect(page.getByTestId("access-presets-page")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("access-presets-new").click();
    await expect(page.getByTestId("access-preset-drawer")).toBeVisible();
    await expect(page.getByTestId("access-preset-checklist")).toBeVisible();
    const selectAll = page.getByTestId("preset-group-select-all-cards");
    await expect(selectAll).toBeVisible();
    await expect(selectAll).toHaveText(/Selecionar tudo/);
    await selectAll.click();
    await expect(selectAll).toHaveText(/Limpar/);
    await selectAll.click();
    await expect(selectAll).toHaveText(/Selecionar tudo/);
    await page.getByTestId("preset-shortcut-viewer").click();
    await expect(page.getByTestId("preset-perm-board.view")).toBeChecked();
  });

  // T2 + invite drawer
  test("T2 invite: Novo nivel abre drawer checklist (sem Base:)", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: /Convidar um integrante/i }).click();
    await expect(page.getByTestId("invite-members-modal")).toBeVisible();
    await expect(page.getByTestId("invite-preset-select")).toBeVisible();
    await page.getByTestId("invite-create-preset").click();
    await expect(page.getByTestId("access-preset-drawer")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("access-preset-checklist")).toBeVisible();
    await expect(page.getByTestId("invite-create-preset-base")).toHaveCount(0);
  });

  // T3 — members list shows preset catalog (not hard-coded roles only)
  test("T3 members: select usa catalogo de presets", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByTestId("board-access-button").click();
    await expect(page.getByTestId("board-access-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("board-members-list")).toBeVisible();
    const selects = page.locator("[data-testid^='member-preset-select-']");
    if ((await selects.count()) > 0) {
      const options = selects.first().locator("option");
      await expect(options.first()).toBeVisible();
      const labels = await options.allTextContents();
      expect(labels.some((l) => /Visualizador|Editor|Administrador/i.test(l))).toBe(true);
    }
  });

  // T5 — viewer cannot open settings presets CRUD
  test("T5 viewer: sem acesso a criar presets", async ({ page }) => {
    await loginAsViewer(page);
    await page.goto("/settings/access-presets");
    const newBtn = page.getByTestId("access-presets-new");
    await expect(newBtn).toHaveCount(0);
  });

  // T7 — org admin (nao owner) nao gerencia presets
  test("T7 org admin: sem CRUD de presets", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await page.goto("/settings");
    await expect(page.getByTestId("org-settings-tab-presets")).toHaveCount(0);
    await page.goto("/settings/access-presets");
    await expect(page.getByTestId("access-presets-new")).toHaveCount(0);
  });
});

/**
 * Matriz QA (cobertura):
 * T1 create custom — E2E acima
 * T2 invite + preset_id — invite drawer E2E; assign coberto por action+pgTAP
 * T3 preset name na lista — select catalogo E2E; attachPresetNames Vitest
 * T4 change member level — assignBoardMemberPresetAction + trigger dual-write
 * T5–T6 permission gates — viewer E2E + Vitest board-authz
 * T7 org admin vs owner — Vitest canManageAccessPresets + pgTAP admin nao cria
 * T8 IDOR — pgTAP 46 (SKIP se Docker down)
 * T9 select-all/clear — E2E acima + Vitest
 * T10 typecheck + Vitest access-presets/board-authz — CI
 *
 * pgTAP 45/46/47: SKIP se Supabase local/Docker indisponivel (ver .estado_atual.md).
 */
