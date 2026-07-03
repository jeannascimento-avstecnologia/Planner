"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AuroraOverlay } from "./aurora-overlay";
import {
  MODAL_BODY_CLASS,
  MODAL_SIZE_CLASS,
  surfacePanelClass,
  type AuroraModalSize,
  type AuroraSurfaceVariant,
} from "./aurora-surface";

type Props = {
  open?: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  variant?: AuroraSurfaceVariant;
  size?: AuroraModalSize;
  testId?: string;
  showHairline?: boolean;
  headerExtra?: ReactNode;
  zIndex?: number;
  /** Conteudo sem padding no body (formularios custom) */
  bodyClassName?: string;
  footer?: ReactNode;
  showClose?: boolean;
  role?: "dialog" | "alertdialog";
};

export function AuroraModal({
  open = true,
  onClose,
  title,
  subtitle,
  children,
  variant = "app",
  size = "md",
  testId,
  showHairline = variant === "app",
  headerExtra,
  zIndex = 50,
  bodyClassName = MODAL_BODY_CLASS,
  footer,
  showClose = true,
  role = "dialog",
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const align = size === "full" ? "items-start pt-8" : "items-center";

  const borderClass = variant === "board" ? "border-board-border" : "border-aurora-border";

  return createPortal(
    <AuroraOverlay onClick={onClose} zIndex={zIndex} className={`justify-center ${align}`}>
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={title ? "aurora-modal-title" : undefined}
        data-testid={testId}
        className={`aurora-modal-enter flex max-h-[min(90dvh,920px)] w-full flex-col ${MODAL_SIZE_CLASS[size]} ${surfacePanelClass(variant)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showHairline ? <div className="aurora-modal-hairline shrink-0" aria-hidden /> : null}
        {title || headerExtra ? (
          <header className={`flex shrink-0 items-center justify-between gap-3 border-b ${borderClass} px-4 py-3 sm:px-6 sm:py-4`}>
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 id="aurora-modal-title" className="truncate text-base font-semibold text-aurora-fg sm:text-lg">
                  {title}
                </h2>
              ) : null}
              {subtitle ? <p className="text-sm text-aurora-muted">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerExtra}
              {showClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="rounded-md p-1 text-aurora-muted transition hover:bg-aurora-surface-2 hover:text-aurora-fg"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </header>
        ) : null}
        <div className={bodyClassName}>
          {children}
        </div>
        {footer ? <footer className={`shrink-0 border-t ${borderClass} px-4 py-3 sm:px-6 sm:py-4`}>{footer}</footer> : null}
      </div>
    </AuroraOverlay>,
    document.body,
  );
}
