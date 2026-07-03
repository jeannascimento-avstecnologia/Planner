"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function pathFromHref(href: string): string {
  return href.split("?")[0] ?? href;
}

/** Lock global: refs por componente nao bloqueiam cliques em outras instancias. */
let globalNavPathTarget: string | null = null;

/** Evita router.push/replace duplicado enquanto pathname/searchParams estao stale. */
export function useGuardedNavigate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    globalNavPathTarget = null;
  }, [pathname]);

  const navigate = useCallback(
    (href: string, opts?: { replace?: boolean; scroll?: boolean }) => {
      const pathOnly = pathFromHref(href);
      if (pathname === pathOnly || globalNavPathTarget === pathOnly) {
        // #region agent log
        fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
          body: JSON.stringify({
            sessionId: "fa60ca",
            runId: "post-fix-v5",
            location: "client-url-state.ts:navigate",
            message: "navigate skipped",
            data: { href, pathname, globalNavPathTarget },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return false;
      }
      globalNavPathTarget = pathOnly;
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "post-fix-v5",
          location: "client-url-state.ts:navigate",
          message: "navigate once",
          data: { href, pathname },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const scroll = opts?.scroll ?? false;
      if (opts?.replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
      return true;
    },
    [pathname, router],
  );

  const onNavigateClick = useCallback(
    (e: MouseEvent, href: string, opts?: { replace?: boolean }) => {
      const pathOnly = pathFromHref(href);
      if (pathname === pathOnly || globalNavPathTarget === pathOnly) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      navigate(href, opts);
    },
    [navigate, pathname],
  );

  return { navigate, onNavigateClick, pathname };
}

export function applySearchParamUpdates(
  baseParams: URLSearchParams,
  updates: Record<string, string | null>,
): URLSearchParams {
  const params = new URLSearchParams(baseParams.toString());
  for (const [key, val] of Object.entries(updates)) {
    if (val === null) params.delete(key);
    else params.set(key, val);
  }
  return params;
}

export function replaceClientUrl(pathname: string, params: URLSearchParams): void {
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
}

/** Client-only URL query param — no router.replace (evita refetch RSC em cliques repetidos). */
export function useClientSearchParamState<T>(
  paramKey: string,
  parse: (raw: string | null) => T,
  toParam: (value: T) => string | null,
): [T, (value: T) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valueRef = useRef(parse(searchParams.get(paramKey)));
  const [value, setValueState] = useState(valueRef.current);

  useEffect(() => {
    const parsed = parse(searchParams.get(paramKey));
    if (parsed !== valueRef.current) {
      valueRef.current = parsed;
      setValueState(parsed);
    }
    // parse/toParam are stable module-level functions at call sites
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paramKey + searchParams only
  }, [searchParams, paramKey]);

  const setValue = useCallback(
    (next: T) => {
      if (next === valueRef.current) return;
      valueRef.current = next;
      setValueState(next);
      const params = applySearchParamUpdates(searchParams, { [paramKey]: toParam(next) });
      replaceClientUrl(pathname, params);
    },
    [pathname, searchParams, paramKey, toParam],
  );

  return [value, setValue];
}
