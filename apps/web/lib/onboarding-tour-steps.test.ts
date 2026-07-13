import { describe, expect, it } from "vitest";
import { buildOnboardingDriveSteps, ONBOARDING_TOUR_STEP_DEFS } from "./onboarding-tour-steps";

describe("buildOnboardingDriveSteps", () => {
  it("inclui passo Carga quando showWorkload=true", () => {
    const steps = buildOnboardingDriveSteps(true);
    const titles = steps.map((s) => s.popover?.title);
    expect(titles.some((t) => String(t).includes("Carga"))).toBe(true);
    expect(steps.length).toBe(ONBOARDING_TOUR_STEP_DEFS.length);
  });

  it("omite passo Carga quando showWorkload=false", () => {
    const steps = buildOnboardingDriveSteps(false);
    const titles = steps.map((s) => s.popover?.title);
    expect(titles.some((t) => String(t).includes("Carga"))).toBe(false);
    expect(steps.length).toBe(ONBOARDING_TOUR_STEP_DEFS.length - 1);
  });

  it("copy premium no welcome", () => {
    const welcome = ONBOARDING_TOUR_STEP_DEFS.find((s) => s.id === "welcome");
    expect(welcome?.description).toContain("Planeje");
  });
});
