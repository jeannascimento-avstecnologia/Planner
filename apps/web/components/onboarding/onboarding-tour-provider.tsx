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
import { usePathname } from "next/navigation";
import { buildOnboardingDriveSteps } from "@/lib/onboarding-tour-steps";
import {
  isOnboardingTourCompleted,
  markOnboardingTourCompleted,
} from "@/lib/onboarding-tour-storage";
import { resolvePageTourId } from "@/lib/page-tour-registry";
import { buildPageDriveSteps, type PageTourId } from "@/lib/page-tour-steps";
import { isPageTourCompleted, markPageTourCompleted } from "@/lib/page-tour-storage";
import { areRequiredTourTargetsPresent } from "@/lib/tour-targets-ready";
import { startDriverTour } from "@/lib/tour-driver";
import type { Driver } from "driver.js";

export type PageTourContext = {
  showWorkload: boolean;
  showAdminSettings: boolean;
};

type OnboardingTourContextValue = {
  openGlobalTour: () => void;
  /** @deprecated use openGlobalTour */
  openOnboardingTour: () => void;
  openPageTour: (tourId?: PageTourId) => void;
  registerSidebarPrep: (fn: () => void) => void;
  registerTourPrep: (tourId: PageTourId, fn: () => void) => void;
  notifyShowWorkload: (show: boolean) => void;
  setPageTourContext: (ctx: Partial<PageTourContext>) => void;
  isTourActive: boolean;
  tryAutoStartPageTour: (pathname: string) => void;
  hasActiveOrg: boolean;
};

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

const AUTO_START_DELAY_MS = 600;

type Props = {
  children: ReactNode;
  setMobileOpen: (open: boolean) => void;
  /** Auto-start so com org ativa (spec onboarding-tour). */
  hasActiveOrg: boolean;
};

export function OnboardingTourProvider({ children, setMobileOpen, hasActiveOrg }: Props) {
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const sidebarPrepRef = useRef<(() => void) | null>(null);
  const tourPrepRef = useRef<Partial<Record<PageTourId, () => void>>>({});
  const showWorkloadRef = useRef(false);
  const pageTourCtxRef = useRef<PageTourContext>({
    showWorkload: false,
    showAdminSettings: false,
  });
  const globalAutoStartedRef = useRef(false);
  const hasActiveOrgRef = useRef(hasActiveOrg);
  const [liveMessage, setLiveMessage] = useState("");
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    hasActiveOrgRef.current = hasActiveOrg;
  }, [hasActiveOrg]);

  const registerSidebarPrep = useCallback((fn: () => void) => {
    sidebarPrepRef.current = fn;
  }, []);

  const registerTourPrep = useCallback((tourId: PageTourId, fn: () => void) => {
    tourPrepRef.current[tourId] = fn;
  }, []);

  const setPageTourContext = useCallback((ctx: Partial<PageTourContext>) => {
    pageTourCtxRef.current = { ...pageTourCtxRef.current, ...ctx };
    if (ctx.showWorkload !== undefined) {
      showWorkloadRef.current = ctx.showWorkload;
    }
  }, []);

  const destroyDriver = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    setIsTourActive(false);
  }, []);

  const prepareMobileSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    }
  }, [setMobileOpen]);

  const runTour = useCallback(
    async (
      steps: ReturnType<typeof buildOnboardingDriveSteps>,
      onComplete: () => void,
      options?: { doneBtnText?: string },
    ) => {
      destroyDriver();
      setIsTourActive(true);

      const driverObj = await startDriverTour(steps, {
        doneBtnText: options?.doneBtnText,
        onHighlightStarted: (idx, total, title) => {
          if (title) setLiveMessage(`Passo ${idx + 1} de ${total}: ${title}`);
        },
        onDestroyed: () => {
          // Sempre persiste (X, Esc, Concluir, destroy) — anti-loop.
          onComplete();
          driverRef.current = null;
          setIsTourActive(false);
        },
      });

      driverRef.current = driverObj;
    },
    [destroyDriver],
  );

  const startGlobalTour = useCallback(async (opts?: { requireTargets?: boolean }) => {
    sidebarPrepRef.current?.();
    prepareMobileSidebar();
    pageTourCtxRef.current.showWorkload = showWorkloadRef.current;

    const steps = buildOnboardingDriveSteps(showWorkloadRef.current);
    if (opts?.requireTargets !== false && !areRequiredTourTargetsPresent(steps)) {
      globalAutoStartedRef.current = false;
      return;
    }

    await runTour(steps, () => {
      markOnboardingTourCompleted();
    }, { doneBtnText: "Comecar" });
  }, [prepareMobileSidebar, runTour]);

  // Apos criar org: hasActiveOrg vira true sem re-chamar notifyShowWorkload.
  useEffect(() => {
    if (!hasActiveOrg) return;
    if (isOnboardingTourCompleted()) return;
    if (globalAutoStartedRef.current) return;
    if (isTourActive) return;

    const timer = window.setTimeout(() => {
      if (!hasActiveOrgRef.current) return;
      if (isOnboardingTourCompleted()) return;
      if (globalAutoStartedRef.current) return;
      globalAutoStartedRef.current = true;
      void startGlobalTour({ requireTargets: true });
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasActiveOrg, isTourActive, startGlobalTour]);

  const startPageTour = useCallback(
    async (tourId: PageTourId, opts?: { requireTargets?: boolean }) => {
      tourPrepRef.current[tourId]?.();
      await new Promise((resolve) => setTimeout(resolve, 400));
      prepareMobileSidebar();

      const ctx = pageTourCtxRef.current;
      const steps = buildPageDriveSteps(tourId, ctx);
      if (opts?.requireTargets !== false && !areRequiredTourTargetsPresent(steps)) {
        return;
      }

      await runTour(steps, () => {
        markPageTourCompleted(tourId);
      });
    },
    [prepareMobileSidebar, runTour],
  );

  const openGlobalTour = useCallback(() => {
    void startGlobalTour({ requireTargets: false });
  }, [startGlobalTour]);

  const openPageTour = useCallback(
    (tourId?: PageTourId) => {
      const id = tourId ?? resolvePageTourId(pathname);
      if (!id) return;
      void startPageTour(id, { requireTargets: false });
    },
    [pathname, startPageTour],
  );

  const tryAutoStartPageTour = useCallback(
    (path: string) => {
      if (!hasActiveOrgRef.current) return;
      if (isTourActive) return;
      if (!isOnboardingTourCompleted()) return;

      const tourId = resolvePageTourId(path);
      if (!tourId) return;
      if (isPageTourCompleted(tourId)) return;

      void startPageTour(tourId, { requireTargets: true });
    },
    [isTourActive, startPageTour],
  );

  const notifyShowWorkload = useCallback(
    (show: boolean) => {
      showWorkloadRef.current = show;
      pageTourCtxRef.current.showWorkload = show;

      if (!hasActiveOrgRef.current) return;
      if (globalAutoStartedRef.current) return;
      if (isOnboardingTourCompleted()) return;

      window.setTimeout(() => {
        if (!hasActiveOrgRef.current) return;
        if (globalAutoStartedRef.current) return;
        if (isOnboardingTourCompleted()) return;
        globalAutoStartedRef.current = true;
        void startGlobalTour({ requireTargets: true });
      }, AUTO_START_DELAY_MS);
    },
    [startGlobalTour],
  );

  useEffect(() => () => destroyDriver(), [destroyDriver]);

  const value: OnboardingTourContextValue = {
    openGlobalTour,
    openOnboardingTour: openGlobalTour,
    openPageTour,
    registerSidebarPrep,
    registerTourPrep,
    notifyShowWorkload,
    setPageTourContext,
    isTourActive,
    tryAutoStartPageTour,
    hasActiveOrg,
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

export function useOnboardingTourOptional(): OnboardingTourContextValue | null {
  return useContext(OnboardingTourContext);
}
