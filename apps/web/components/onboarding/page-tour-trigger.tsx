"use client";

import { Compass } from "lucide-react";
import { usePathname } from "next/navigation";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";
import { resolvePageTourId } from "@/lib/page-tour-registry";

type Props = {
  className?: string;
};

export function PageTourTrigger({ className }: Props) {
  const pathname = usePathname();
  const { openPageTour } = useOnboardingTour();
  const tourId = resolvePageTourId(pathname);

  if (!tourId) return null;

  return (
    <button
      type="button"
      onClick={() => openPageTour(tourId)}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-aurora-border bg-aurora-surface px-3 py-1.5 text-sm font-medium text-aurora-fg transition hover:border-aurora-brand/40 hover:text-aurora-brand"
      }
      data-testid="page-tour-trigger"
    >
      <Compass className="h-3.5 w-3.5" aria-hidden />
      Ver tour desta pagina
    </button>
  );
}
