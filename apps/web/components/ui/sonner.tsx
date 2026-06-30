"use client";

import { Toaster } from "sonner";

export function AuroraToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-aurora-border bg-aurora-surface text-aurora-fg shadow-lg",
          title: "text-sm font-medium text-aurora-fg",
          description: "text-sm text-aurora-muted",
          success: "border-aurora-success/40 bg-aurora-success/10",
          error: "border-aurora-danger/40 bg-aurora-danger/10",
          actionButton: "bg-aurora-accent text-white",
          cancelButton: "bg-aurora-surface-2 text-aurora-fg",
        },
      }}
      closeButton
      richColors
    />
  );
}
