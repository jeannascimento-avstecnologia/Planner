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
import {
  canAutoStartTour,
  waitForRequiredTourTargets,
} from "@/lib/tour-targets-ready";
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
  const isTourActiveRef = useRef(false);
  const autoStartAbortRef = useRef<AbortController | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    hasActiveOrgRef.current = hasActiveOrg;
  }, [hasActiveOrg]);

  useEffect(() => {
    isTourActiveRef.current = isTourActive;
  }, [isTourActive]);

  const abortPendingAutoStart = useCallback(() => {
    autoStartAbortRef.current?.abort();
    autoStartAbortRef.current = null;
  }, []);

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
          // So chama apos tour realmente iniciado (nao apos abort de wait).
          onComplete();
          driverRef.current = null;
          setIsTourActive(false);
        },
      });

      driverRef.current = driverObj;
    },
    [destroyDriver],
  );

  const isAutoStartEligible = useCallback(() => {
    return (
      canAutoStartTour(hasActiveOrgRef.current) &&
      !isOnboardingTourCompleted() &&
      !isTourActiveRef.current
    );
  }, []);

  const startGlobalTour = useCallback(
    async (opts?: { requireTargets?: boolean; signal?: AbortSignal }) => {
      if (opts?.requireTargets !== false && !canAutoStartTour(hasActiveOrgRef.current)) {
        return false;
      }

      sidebarPrepRef.current?.();
      prepareMobileSidebar();
      pageTourCtxRef.current.showWorkload = showWorkloadRef.current;

      const buildSteps = () => buildOnboardingDriveSteps(showWorkloadRef.current);
      let steps = buildSteps();

      if (opts?.requireTargets !== false) {
        const ready = await waitForRequiredTourTargets(steps, {
          signal: opts?.signal,
          isStillEligible: () =>
            canAutoStartTour(hasActiveOrgRef.current) && !isOnboardingTourCompleted(),
        });
        if (!ready) {
          // Abort / targets ausentes: NAO marcar completed.
          return false;
        }
        // Reavalia steps (showWorkload pode ter chegado durante o wait).
        steps = buildSteps();
        const stillReady = await waitForRequiredTourTargets(steps, {
          maxAttempts: 4,
          signal: opts?.signal,
          isStillEligible: () =>
            canAutoStartTour(hasActiveOrgRef.current) && !isOnboardingTourCompleted(),
        });
        if (!stillReady) return false;
      }

      if (opts?.signal?.aborted) return false;
      if (opts?.requireTargets !== false && !isAutoStartEligible()) return false;

      await runTour(steps, () => {
        markOnboardingTourCompleted();
      }, { doneBtnText: "Comecar" });
      return true;
    },
    [isAutoStartEligible, prepareMobileSidebar, runTour],
  );

  // Sem org: abort wait + libera flag para reavaliar apos create-org.
  useEffect(() => {
    if (hasActiveOrg) return;
    abortPendingAutoStart();
    globalAutoStartedRef.current = false;
  }, [hasActiveOrg, abortPendingAutoStart]);

  // Apos create-org (hasActiveOrg false→true) ou 1a carga com org: retry targets.
  useEffect(() => {
    if (!canAutoStartTour(hasActiveOrg)) return;
    if (isOnboardingTourCompleted()) return;
    if (globalAutoStartedRef.current) return;
    if (isTourActive) return;

    abortPendingAutoStart();
    const controller = new AbortController();
    autoStartAbortRef.current = controller;

    const timer = window.setTimeout(() => {
      if (!isAutoStartEligible()) return;
      if (globalAutoStartedRef.current) return;
      globalAutoStartedRef.current = true;

      void startGlobalTour({ requireTargets: true, signal: controller.signal }).then((started) => {
        if (!started && !controller.signal.aborted) {
          // Targets esgotaram: libera para nova tentativa se hasActiveOrg/DOM mudar.
          globalAutoStartedRef.current = false;
        }
      });
    }, AUTO_START_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (autoStartAbortRef.current === controller) {
        autoStartAbortRef.current = null;
      }
    };
  }, [hasActiveOrg, isTourActive, startGlobalTour, abortPendingAutoStart, isAutoStartEligible]);

  const startPageTour = useCallback(
    async (tourId: PageTourId, opts?: { requireTargets?: boolean; signal?: AbortSignal }) => {
      if (opts?.requireTargets !== false && !canAutoStartTour(hasActiveOrgRef.current)) {
        return false;
      }

      tourPrepRef.current[tourId]?.();
      await new Promise((resolve) => setTimeout(resolve, 400));
      prepareMobileSidebar();

      const ctx = pageTourCtxRef.current;
      const steps = buildPageDriveSteps(tourId, ctx);

      if (opts?.requireTargets !== false) {
        const ready = await waitForRequiredTourTargets(steps, {
          signal: opts?.signal,
          isStillEligible: () => canAutoStartTour(hasActiveOrgRef.current),
        });
        if (!ready) return false;
      }

      if (opts?.signal?.aborted) return false;

      await runTour(steps, () => {
        markPageTourCompleted(tourId);
      });
      return true;
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
      if (!canAutoStartTour(hasActiveOrgRef.current)) return;
      if (isTourActive) return;
      if (!isOnboardingTourCompleted()) return;

      const tourId = resolvePageTourId(path);
      if (!tourId) return;
      if (isPageTourCompleted(tourId)) return;

      void startPageTour(tourId, { requireTargets: true });
    },
    [isTourActive, startPageTour],
  );

  const notifyShowWorkload = useCallback((show: boolean) => {
    showWorkloadRef.current = show;
    pageTourCtxRef.current.showWorkload = show;
    // Auto-start so via effect hasActiveOrg (retry/backoff). Evita double-start.
  }, []);

  useEffect(() => () => {
    abortPendingAutoStart();
    destroyDriver();
  }, [abortPendingAutoStart, destroyDriver]);

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
