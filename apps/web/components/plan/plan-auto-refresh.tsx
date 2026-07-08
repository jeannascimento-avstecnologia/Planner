"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const MIN_HIDDEN_MS = 30_000;

/** Refresh RSC do plano so apos aba oculta >30s (evita refetch em focus rapido). */
export function PlanAutoRefresh() {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt && Date.now() - hiddenAt >= MIN_HIDDEN_MS) {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  return null;
}
