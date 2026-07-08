"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ComponentProps, type MouseEvent } from "react";
import { isSamePath, pathFromHref } from "@/lib/client-url-state";
import {
  clearNavigationInFlight,
  isNavigationInFlight,
  setNavigationInFlight,
} from "@/lib/navigation-in-flight";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  onSamePathClick?: () => void;
};

/** Link com dedupe por pathname (ignora query) + guard in-flight. */
export function NavLink({ href, onClick, onSamePathClick, ...props }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const pathOnly = pathFromHref(href);

  useEffect(() => {
    clearNavigationInFlight();
  }, [pathname]);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (isSamePath(href, pathname)) {
      e.preventDefault();
      onSamePathClick?.();
      return;
    }

    if (isNavigationInFlight(pathOnly)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    setNavigationInFlight(pathOnly);
    router.push(href, { scroll: false });
  }

  return <Link href={href} prefetch={false} onClick={handleClick} scroll={false} {...props} />;
}
