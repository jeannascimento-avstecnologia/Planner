"use client";

import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
  onCancel,
  pending = false,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        className="hub-panel-enter w-full max-w-sm rounded-xl border border-aurora-border bg-aurora-surface p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-aurora-fg">
          {title}
        </h2>
        <p className="mt-2 text-sm text-aurora-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-aurora-border px-3 py-1.5 text-sm text-aurora-fg hover:bg-aurora-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-aurora-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {pending ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
