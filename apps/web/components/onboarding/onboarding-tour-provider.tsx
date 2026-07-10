"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildOnboardingDriveSteps } from "@/lib/onboarding-tour-steps";
import {
  isOnboardingTourCompleted,
  markOnboardingTourCompleted,
} from "@/lib/onboarding-tour-storage";
import type { Driver } from "driver.js";

type OnboardingTourContextValue = {
  openOnboardingTour: () => void;
  registerSidebarPrep: (fn: () => void) => void;
  notifyShowWorkload: (show: boolean) => void;
};

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

const AUTO_START_DELAY_MS = 600;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  children: ReactNode;
  setMobileOpen: (open: boolean) => void;
};

export function OnboardingTourProvider({ children, setMobileOpen }: Props) {
  const driverRef = useRef<Driver | null>(null);
  const sidebarPrepRef = useRef<(() => void) | null>(null);
  const showWorkloadRef = useRef(false);
  const autoStartedRef = useRef(false);
  const [liveMessage, setLiveMessage] = useState("");

  const registerSidebarPrep = useCallback((fn: () => void) => {
    sidebarPrepRef.current = fn;
  }, []);

  const destroyDriver = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const startTour = useCallback(async () => {
    destroyDriver();
    sidebarPrepRef.current?.();

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    }

    const { driver } = await import("driver.js");

    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Proximo",
      prevBtnText: "Voltar",
      doneBtnText: "Comecar",
      showButtons: ["previous", "next", "close"],
      popoverClass: "agify-tour-popover",
      animate: !prefersReducedMotion(),
      steps: buildOnboardingDriveSteps(showWorkloadRef.current),
      onHighlightStarted: (_el, _step, { state }) => {
        const idx = state.activeIndex ?? 0;
        const steps = buildOnboardingDriveSteps(showWorkloadRef.current);
        const step = steps[idx];
        const title =
          step && "popover" in step && step.popover && typeof step.popover === "object"
            ? String(step.popover.title ?? "")
            : "";
        if (title) setLiveMessage(`Passo ${idx + 1} de ${steps.length}: ${title}`);
      },
      onDestroyed: () => {
        markOnboardingTourCompleted();
        driverRef.current = null;
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [destroyDriver, setMobileOpen]);

  const notifyShowWorkload = useCallback(
    (show: boolean) => {
      showWorkloadRef.current = show;
      if (autoStartedRef.current) return;
      if (isOnboardingTourCompleted()) return;
      autoStartedRef.current = true;
      window.setTimeout(() => {
        if (!isOnboardingTourCompleted()) void startTour();
      }, AUTO_START_DELAY_MS);
    },
    [startTour],
  );

  const openOnboardingTour = useCallback(() => {
    void startTour();
  }, [startTour]);

  useEffect(() => () => destroyDriver(), [destroyDriver]);

  const value: OnboardingTourContextValue = {
    openOnboardingTour,
    registerSidebarPrep,
    notifyShowWorkload,
  };

  return (
    <OnboardingTourContext.Provider value={value}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      {children}
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) {
    throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  }
  return ctx;
}

/** Hook opcional fora do provider (ex.: testes) — retorna null se ausente. */
export function useOnboardingTourOptional(): OnboardingTourContextValue | null {
  return useContext(OnboardingTourContext);
}
