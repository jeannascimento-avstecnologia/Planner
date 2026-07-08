"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { applySearchParamUpdates } from "@/lib/client-url-state";
import { segmentItemActiveClass, segmentItemClass, segmentTrackClass } from "@/lib/ui-classes";

type Props = {
  mode: "week" | "15d";
  weekStartIso?: string;
  planStartIso?: string;
};

export function WorkloadViewToggle({ mode, weekStartIso, planStartIso }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setMode(next: "week" | "15d") {
    if (next === mode) return;
    const params = applySearchParamUpdates(searchParams, {
      mode: next,
      start: next === "15d" && planStartIso ? planStartIso : null,
      week: next === "week" && weekStartIso ? weekStartIso : null,
    });
    router.replace(`/workload?${params}`, { scroll: false });
  }

  return (
    <div className={segmentTrackClass} role="tablist" aria-label="Modo de visualizacao" data-testid="workload-view-toggle">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "week"}
        onClick={() => setMode("week")}
        className={`${segmentItemClass} ${mode === "week" ? segmentItemActiveClass : ""}`}
      >
        Semana
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "15d"}
        onClick={() => setMode("15d")}
        className={`${segmentItemClass} ${mode === "15d" ? segmentItemActiveClass : ""}`}
      >
        15 dias
      </button>
    </div>
  );
}
