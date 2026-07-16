import type { DriveStep } from "driver.js";

/** Conta passos com seletor CSS cujo elemento ainda nao esta no DOM. */
export function countMissingTourTargets(steps: DriveStep[]): number {
  if (typeof document === "undefined") return 0;
  let missing = 0;
  for (const step of steps) {
    if (!("element" in step) || step.element == null) continue;
    if (typeof step.element !== "string") continue;
    if (!document.querySelector(step.element)) missing += 1;
  }
  return missing;
}

/** True se todos os passos com `element` string existem no DOM. */
export function areRequiredTourTargetsPresent(steps: DriveStep[]): boolean {
  return countMissingTourTargets(steps) === 0;
}

/** ready = org ativa + alvos DOM presentes (gate unico de auto-start). */
export function isTourAutoStartReady(hasActiveOrg: boolean, steps: DriveStep[]): boolean {
  return hasActiveOrg && areRequiredTourTargetsPresent(steps);
}

/**
 * Rotas de bootstrap (form criar org) — sem org ativa o tour nao deve auto-iniciar.
 * Com org, /boards e /projects sao rotas normais.
 */
export function canAutoStartTour(hasActiveOrg: boolean): boolean {
  return hasActiveOrg;
}

export const TOUR_TARGETS_MAX_ATTEMPTS = 8;
export const TOUR_TARGETS_INITIAL_DELAY_MS = 120;
export const TOUR_TARGETS_BACKOFF_FACTOR = 1.6;

export type WaitForTourTargetsOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  signal?: AbortSignal;
  /** Se retornar false, aborta wait sem marcar tour completed. */
  isStillEligible?: () => boolean;
};

export function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Espera alvos DOM com backoff. Retorna false se abort/esgotar tentativas
 * (caller NAO deve marcar completed).
 */
export async function waitForRequiredTourTargets(
  steps: DriveStep[],
  options: WaitForTourTargetsOptions = {},
): Promise<boolean> {
  const maxAttempts = options.maxAttempts ?? TOUR_TARGETS_MAX_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? TOUR_TARGETS_INITIAL_DELAY_MS;
  const backoffFactor = options.backoffFactor ?? TOUR_TARGETS_BACKOFF_FACTOR;
  const { signal, isStillEligible } = options;

  let delay = initialDelayMs;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) return false;
    if (isStillEligible && !isStillEligible()) return false;
    if (areRequiredTourTargetsPresent(steps)) return true;
    if (attempt >= maxAttempts - 1) break;
    try {
      await sleepMs(delay, signal);
    } catch {
      return false;
    }
    delay = Math.round(delay * backoffFactor);
  }

  if (signal?.aborted) return false;
  if (isStillEligible && !isStillEligible()) return false;
  return areRequiredTourTargetsPresent(steps);
}
