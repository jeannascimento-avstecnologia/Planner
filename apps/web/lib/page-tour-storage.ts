const PAGE_TOUR_PREFIX = "ngp:page-tour-completed:";

export function pageTourStorageKey(tourId: string): string {
  return `${PAGE_TOUR_PREFIX}${tourId}`;
}

export function isPageTourCompleted(tourId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(pageTourStorageKey(tourId)) === "1";
  } catch {
    return false;
  }
}

export function markPageTourCompleted(tourId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pageTourStorageKey(tourId), "1");
  } catch {
    // ignore
  }
}

export function clearPageTourCompleted(tourId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(pageTourStorageKey(tourId));
  } catch {
    // ignore
  }
}
