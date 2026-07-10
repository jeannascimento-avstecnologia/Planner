export const ONBOARDING_TOUR_COMPLETED_KEY = "ngp:onboarding-tour-completed";

export function isOnboardingTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_TOUR_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingTourCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_TOUR_COMPLETED_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearOnboardingTourCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_TOUR_COMPLETED_KEY);
  } catch {
    // ignore
  }
}
