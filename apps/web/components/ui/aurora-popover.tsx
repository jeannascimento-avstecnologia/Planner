"use client";

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { surfacePopoverClass, type AuroraSurfaceVariant } from "./aurora-surface";

type Props = {
  open?: boolean;
  children: ReactNode;
  variant?: AuroraSurfaceVariant;
  testId?: string;
  zIndex?: number;
  style?: CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function AuroraPopover({
  open = true,
  children,
  variant = "app",
  testId,
  zIndex = 60,
  style,
  className = "",
  onClick,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-testid={testId}
      style={{ position: "fixed", zIndex, ...style }}
      className={`aurora-modal-enter ${surfacePopoverClass(variant)} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>,
    document.body,
  );
}
