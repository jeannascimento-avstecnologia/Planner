"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AuroraOverlay } from "./aurora-overlay";
import { surfacePanelClass, type AuroraSurfaceVariant } from "./aurora-surface";

type Props = {
  open?: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: AuroraSurfaceVariant;
  testId?: string;
  zIndex?: number;
  widthClass?: string;
  showHeader?: boolean;
};

export function AuroraDrawer({
  open = true,
  onClose,
  title,
  children,
  variant = "board",
  testId,
  zIndex = 50,
  widthClass = "w-full max-w-md",
  showHeader = true,
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

  return createPortal(
    <AuroraOverlay onClick={onClose} zIndex={zIndex} className="justify-end p-0">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Painel"}
        data-testid={testId}
        className={`aurora-drawer-enter flex h-full flex-col border-l ${widthClass} ${surfacePanelClass(variant)} rounded-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && title ? (
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-board-border px-4 py-3">
            <h2 className="text-base font-semibold text-aurora-fg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md p-1 text-aurora-muted hover:text-aurora-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </AuroraOverlay>,
    document.body,
  );
}
