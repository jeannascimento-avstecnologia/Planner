import { test, expect } from "@playwright/test";
import { loginAsViewer, openSeedBoard } from "./helpers";

test.describe("Board viewer UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsViewer(page);
  });

  test("kanban sem formulario de novo card nem botao convidar", async ({ page }) => {
    await openSeedBoard(page);
    await expect(page.getByRole("button", { name: /Convidar um integrante/i })).not.toBeVisible();
    await expect(page.getByTestId("board-access-button")).not.toBeVisible();
    await expect(page.getByTestId("create-card-form")).not.toBeVisible();
    await expect(page.getByTestId("manage-stages")).not.toBeVisible();
  });

  test("drawer em modo leitura sem salvar ou excluir", async ({ page }) => {
    await openSeedBoard(page);
    await page.getByText("Configurar Supabase local").click();
    await expect(page.getByTestId("card-drawer-readonly")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ver card" })).toBeVisible();
    await expect(page.getByTestId("card-save")).not.toBeVisible();
    await expect(page.getByTestId("delete-card")).not.toBeVisible();
  });
});
