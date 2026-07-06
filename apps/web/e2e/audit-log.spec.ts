import { test, expect } from "@playwright/test";
import { loginAsOrgAdmin } from "./helpers";

test.describe("audit log", () => {
  test("admin acessa pagina auditoria", async ({ page }) => {
    await loginAsOrgAdmin(page);
    await page.goto("/settings/audit");
    await expect(page.getByTestId("audit-log-page")).toBeVisible();
  });
});
