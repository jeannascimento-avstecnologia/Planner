"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";

const AUTO_START_DELAY_MS = 600;

export function PageTourAutoTrigger() {
  const pathname = usePathname();
  const { tryAutoStartPageTour, isTourActive } = useOnboardingTour();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTourActive) return;

    timerRef.current = setTimeout(() => {
      tryAutoStartPageTour(pathname);
    }, AUTO_START_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, tryAutoStartPageTour, isTourActive]);

  return null;
}
