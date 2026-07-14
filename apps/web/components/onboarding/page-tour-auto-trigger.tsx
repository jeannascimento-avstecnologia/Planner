"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";

const AUTO_START_DELAY_MS = 1_500;

function scheduleAutoStart(callback: () => void): () => void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: AUTO_START_DELAY_MS + 500 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timerId = setTimeout(callback, AUTO_START_DELAY_MS);
  return () => clearTimeout(timerId);
}

export function PageTourAutoTrigger() {
  const pathname = usePathname();
  const { tryAutoStartPageTour, isTourActive } = useOnboardingTour();
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cancelRef.current?.();
    if (isTourActive) return;

    cancelRef.current = scheduleAutoStart(() => {
      tryAutoStartPageTour(pathname);
    });

    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [pathname, tryAutoStartPageTour, isTourActive]);

  return null;
}
