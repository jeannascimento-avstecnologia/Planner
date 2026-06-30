"use client";

import { AuroraModal } from "./aurora-modal";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  variant?: "app" | "board";
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
  onCancel,
  pending = false,
  variant = "app",
}: Props) {
  return (
    <AuroraModal
      open={open}
      onClose={onCancel}
      title={title}
      variant={variant}
      size="sm"
      role="alertdialog"
      showClose={false}
      showHairline={variant === "app"}
      zIndex={200}
      bodyClassName="px-5 py-4"
      footer={
        <div className="flex justify-end gap-2">
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
      }
    >
      <p className="text-sm text-aurora-muted">{message}</p>
    </AuroraModal>
  );
}
