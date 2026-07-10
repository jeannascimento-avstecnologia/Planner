import { describe, expect, it } from "vitest";
import { buildOnboardingDriveSteps, ONBOARDING_TOUR_STEP_DEFS } from "./onboarding-tour-steps";

describe("buildOnboardingDriveSteps", () => {
  it("inclui passo Carga quando showWorkload=true", () => {
    const steps = buildOnboardingDriveSteps(true);
    const titles = steps.map((s) => s.popover?.title);
    expect(titles).toContain("Carga");
    expect(steps.length).toBe(ONBOARDING_TOUR_STEP_DEFS.length);
  });

  it("omite passo Carga quando showWorkload=false", () => {
    const steps = buildOnboardingDriveSteps(false);
    const titles = steps.map((s) => s.popover?.title);
    expect(titles).not.toContain("Carga");
    expect(steps.length).toBe(ONBOARDING_TOUR_STEP_DEFS.length - 1);
  });
});
