import { test, expect } from "@playwright/test";
import { loginAsOrgAdmin, loginAsViewer } from "./helpers";

test.describe("audit log", () => {
  test("admin acessa pagina auditoria", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await page.goto("/settings/audit");
    await expect(page.getByTestId("audit-log-page")).toBeVisible();
    await expect(page.getByTestId("audit-log-filters")).toBeVisible();
    await expect(page.getByTestId("audit-export-csv")).toBeVisible();
    await expect(page.getByTestId("audit-export-pdf")).toBeVisible();
  });

  test("export csv respondem 200", async ({ page }) => {
    await loginAsOrgAdmin(page);
    const res = await page.request.get(
      "/api/audit/export?orgId=22222222-2222-2222-2222-222222222222&format=csv",
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toMatch(/attachment.*\.csv/);
  });

  test("viewer nao acessa auditoria", async ({ page }) => {
    await loginAsViewer(page);
    await page.goto("/settings/audit");
    await expect(page).not.toHaveURL(/\/settings\/audit$/);
  });

  test("viewer recebe 403 no export", async ({ page }) => {
    await loginAsViewer(page);
    const res = await page.request.get("/api/audit/export?orgId=22222222-2222-2222-2222-222222222222&format=csv");
    expect(res.status()).toBe(403);
  });
});
