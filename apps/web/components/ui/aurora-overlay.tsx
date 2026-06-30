"use client";

import type { MouseEvent, ReactNode } from "react";

type Props = {
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  zIndex?: number;
};

export function AuroraOverlay({ onClick, className = "", children, zIndex = 50 }: Props) {
  function handleClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClick?.();
  }

  return (
    <div
      className={`aurora-overlay aurora-overlay-enter fixed inset-0 flex p-4 ${className}`}
      style={{ zIndex }}
      onClick={handleClick}
      aria-hidden={onClick ? undefined : true}
    >
      {children}
    </div>
  );
}
