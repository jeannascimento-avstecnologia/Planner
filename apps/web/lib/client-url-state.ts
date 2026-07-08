"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function pathFromHref(href: string): string {
  return href.split("?")[0] ?? href;
}

export function isSamePath(href: string, pathname: string): boolean {
  return pathFromHref(href) === pathname;
}

/** Evita router.push/replace quando ja estamos na rota alvo. */
export function useGuardedNavigate() {
  const pathname = usePathname();
  const router = useRouter();

  const navigate = useCallback(
    (href: string, opts?: { replace?: boolean; scroll?: boolean }) => {
      const pathOnly = pathFromHref(href);
      if (pathname === pathOnly) return false;
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
      if (pathname === pathOnly) {
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
