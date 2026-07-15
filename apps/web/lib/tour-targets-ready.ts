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
