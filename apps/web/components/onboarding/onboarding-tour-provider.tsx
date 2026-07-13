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
};

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

const AUTO_START_DELAY_MS = 600;

type Props = {
  children: ReactNode;
  setMobileOpen: (open: boolean) => void;
};

export function OnboardingTourProvider({ children, setMobileOpen }: Props) {
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
  const [liveMessage, setLiveMessage] = useState("");
  const [isTourActive, setIsTourActive] = useState(false);

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
          onComplete();
          driverRef.current = null;
          setIsTourActive(false);
        },
      });

      driverRef.current = driverObj;
    },
    [destroyDriver],
  );

  const startGlobalTour = useCallback(async () => {
    sidebarPrepRef.current?.();
    prepareMobileSidebar();
    pageTourCtxRef.current.showWorkload = showWorkloadRef.current;

    await runTour(buildOnboardingDriveSteps(showWorkloadRef.current), () => {
      markOnboardingTourCompleted();
    }, { doneBtnText: "Comecar" });
  }, [prepareMobileSidebar, runTour]);

  const startPageTour = useCallback(
    async (tourId: PageTourId) => {
      tourPrepRef.current[tourId]?.();
      await new Promise((resolve) => setTimeout(resolve, 400));
      prepareMobileSidebar();

      const ctx = pageTourCtxRef.current;
      await runTour(buildPageDriveSteps(tourId, ctx), () => {
        markPageTourCompleted(tourId);
      });
    },
    [prepareMobileSidebar, runTour],
  );

  const openGlobalTour = useCallback(() => {
    void startGlobalTour();
  }, [startGlobalTour]);

  const openPageTour = useCallback(
    (tourId?: PageTourId) => {
      const id = tourId ?? resolvePageTourId(pathname);
      if (!id) return;
      void startPageTour(id);
    },
    [pathname, startPageTour],
  );

  const tryAutoStartPageTour = useCallback(
    (path: string) => {
      if (isTourActive) return;
      if (!isOnboardingTourCompleted()) return;

      const tourId = resolvePageTourId(path);
      if (!tourId) return;
      if (isPageTourCompleted(tourId)) return;

      void startPageTour(tourId);
    },
    [isTourActive, startPageTour],
  );

  const notifyShowWorkload = useCallback(
    (show: boolean) => {
      showWorkloadRef.current = show;
      pageTourCtxRef.current.showWorkload = show;

      if (globalAutoStartedRef.current) return;
      if (isOnboardingTourCompleted()) return;
      globalAutoStartedRef.current = true;

      window.setTimeout(() => {
        if (!isOnboardingTourCompleted()) void startGlobalTour();
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
