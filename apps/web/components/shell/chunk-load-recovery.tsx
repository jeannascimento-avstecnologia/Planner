"use client";

import { useEffect } from "react";

const RELOAD_KEY = "ngp:chunk-reload";

function isChunkLoadFailure(message: string): boolean {
  return (
    /ChunkLoadError|Loading chunk \d+ failed/i.test(message) ||
    /Cannot read properties of undefined \(reading 'call'\)/i.test(message)
  );
}

/** Recarrega uma vez quando chunks stale (pos-deploy) causam 404 em /_next/static. */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (typeof sessionStorage === "undefined") return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    sessionStorage.removeItem(RELOAD_KEY);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
