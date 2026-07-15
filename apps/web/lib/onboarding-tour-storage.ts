export const ONBOARDING_TOUR_COMPLETED_KEY = "ngp:onboarding-tour-completed";

/** Fallback in-memory se localStorage falhar (anti-loop na sessao). */
const memoryFallback = new Map<string, string>();

export function isOnboardingTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(ONBOARDING_TOUR_COMPLETED_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return memoryFallback.get(ONBOARDING_TOUR_COMPLETED_KEY) === "1";
}

export function markOnboardingTourCompleted(): void {
  if (typeof window === "undefined") return;
  memoryFallback.set(ONBOARDING_TOUR_COMPLETED_KEY, "1");
  try {
    localStorage.setItem(ONBOARDING_TOUR_COMPLETED_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearOnboardingTourCompleted(): void {
  if (typeof window === "undefined") return;
  memoryFallback.delete(ONBOARDING_TOUR_COMPLETED_KEY);
  try {
    localStorage.removeItem(ONBOARDING_TOUR_COMPLETED_KEY);
  } catch {
    // ignore
  }
}
