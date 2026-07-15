const PAGE_TOUR_PREFIX = "ngp:page-tour-completed:";

/** Fallback in-memory se localStorage falhar (anti-loop na sessao). */
const memoryFallback = new Map<string, string>();

export function pageTourStorageKey(tourId: string): string {
  return `${PAGE_TOUR_PREFIX}${tourId}`;
}

export function isPageTourCompleted(tourId: string): boolean {
  if (typeof window === "undefined") return false;
  const key = pageTourStorageKey(tourId);
  try {
    if (localStorage.getItem(key) === "1") return true;
  } catch {
    // ignore
  }
  return memoryFallback.get(key) === "1";
}

export function markPageTourCompleted(tourId: string): void {
  if (typeof window === "undefined") return;
  const key = pageTourStorageKey(tourId);
  memoryFallback.set(key, "1");
  try {
    localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

export function clearPageTourCompleted(tourId: string): void {
  if (typeof window === "undefined") return;
  const key = pageTourStorageKey(tourId);
  memoryFallback.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
