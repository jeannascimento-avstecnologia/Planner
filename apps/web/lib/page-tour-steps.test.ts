import { describe, expect, it } from "vitest";
import { buildPageDriveSteps } from "./page-tour-steps";

describe("buildPageDriveSteps", () => {
  it("omite passos de workload sem permissao", () => {
    const steps = buildPageDriveSteps("workload", {
      showWorkload: false,
      showAdminSettings: false,
    });
    expect(steps.length).toBe(0);
  });

  it("inclui passos de workload para gestores", () => {
    const steps = buildPageDriveSteps("workload", {
      showWorkload: true,
      showAdminSettings: false,
    });
    const titles = steps.map((s) => s.popover?.title);
    expect(titles).toContain("Carga da equipe");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("omite cards admin em settings para membros", () => {
    const memberSteps = buildPageDriveSteps("settings", {
      showWorkload: false,
      showAdminSettings: false,
    });
    const adminSteps = buildPageDriveSteps("settings", {
      showWorkload: false,
      showAdminSettings: true,
    });
    expect(memberSteps.length).toBeLessThan(adminSteps.length);
    const memberTitles = memberSteps.map((s) => s.popover?.title);
    expect(memberTitles).not.toContain("Administracao");
  });
});
