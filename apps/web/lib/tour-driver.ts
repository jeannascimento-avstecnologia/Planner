import type { DriveStep, Driver } from "driver.js";

export type TourDriverLabels = {
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;
  progressText?: string;
};

export type StartDriverTourOptions = TourDriverLabels & {
  onHighlightStarted?: (index: number, total: number, title: string) => void;
  onDestroyed?: () => void;
  showProgress?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function startDriverTour(
  steps: DriveStep[],
  options: StartDriverTourOptions = {},
): Promise<Driver> {
  const { driver } = await import("driver.js");

  const driverObj = driver({
    showProgress: options.showProgress ?? true,
    progressText: options.progressText ?? "{{current}} de {{total}}",
    nextBtnText: options.nextBtnText ?? "Proximo",
    prevBtnText: options.prevBtnText ?? "Voltar",
    doneBtnText: options.doneBtnText ?? "Concluir",
    showButtons: ["previous", "next", "close"],
    popoverClass: "agify-tour-popover",
    animate: !prefersReducedMotion(),
    steps,
    onHighlightStarted: (_el, _step, { state }) => {
      const idx = state.activeIndex ?? 0;
      const step = steps[idx];
      const title =
        step && "popover" in step && step.popover && typeof step.popover === "object"
          ? String(step.popover.title ?? "")
          : "";
      options.onHighlightStarted?.(idx, steps.length, title);
    },
    onDestroyed: () => {
      options.onDestroyed?.();
    },
  });

  driverObj.drive();
  return driverObj;
}
