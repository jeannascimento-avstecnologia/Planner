"use client";

import { useEffect } from "react";

const RELOAD_KEY = "ngp:chunk-reload";

function isChunkLoadFailure(message: string): boolean {
  return (
    /ChunkLoadError|Loading chunk [\w/-]+ failed/i.test(message) ||
    /Loading CSS chunk [\w/-]+ failed/i.test(message) ||
    /Cannot read properties of undefined \(reading 'call'\)/i.test(message)
  );
}

function isNextStaticScriptTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLScriptElement)) return false;
  const src = target.src ?? "";
  return src.includes("/_next/static/");
}

/** Recarrega uma vez quando chunks stale (pos-deploy) causam 404 em /_next/static. */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (typeof sessionStorage === "undefined") return;
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      // Resource errors (script 404) so disparam em capture; message fica vazio.
      if (isNextStaticScriptTarget(event.target)) {
        reloadOnce();
        return;
      }
      const msg = event.message ?? "";
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    // Libera nova tentativa so apos pagina estavel (evita loop se chunks ausentes no disco).
    const clearTimer = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
    }, 12_000);

    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
