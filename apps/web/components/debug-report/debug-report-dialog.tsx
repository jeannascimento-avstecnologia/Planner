"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bug, ChevronDown, Loader2 } from "lucide-react";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui-classes";
import { DebugReportFormSchema, type DebugReportFormValues, type SessionLogEvent } from "@/lib/debug-report";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotDataUrl: string | null;
  sessionLog: SessionLogEvent[];
  isSubmitting: boolean;
  onSubmit: (values: DebugReportFormValues) => void;
};

function shortcutLabel(): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? "⌘⇧D" : "Ctrl+Shift+D";
}

export function DebugReportDialog({
  open,
  onOpenChange,
  screenshotDataUrl,
  sessionLog,
  isSubmitting,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setNotes("");
      setFieldErrors({});
    }
  }, [open]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = DebugReportFormSchema.safeParse({
      title,
      description,
      notes: notes.trim() ? notes : undefined,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        title: flat.title?.[0],
        description: flat.description?.[0],
      });
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  return (
    <AuroraModal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Reportar problema"
      subtitle={`Captura e contexto coletados automaticamente. Atalho: ${shortcutLabel()}`}
      size="lg"
      zIndex={200}
      testId="debug-report-dialog"
      headerExtra={<Bug className="h-5 w-5 text-aurora-accent" aria-hidden />}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="debug-report-form"
            className={btnPrimary}
            disabled={isSubmitting || !screenshotDataUrl}
            data-testid="debug-report-submit"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </span>
            ) : (
              "Enviar relatório"
            )}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <form id="debug-report-form" className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-aurora-fg">
            Título
            <input
              className={`${inputClass} mt-1`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do problema"
              maxLength={200}
              data-testid="debug-report-title"
            />
            {fieldErrors.title ? (
              <span className="mt-1 block text-xs text-aurora-danger">{fieldErrors.title}</span>
            ) : null}
          </label>
          <label className="block text-sm font-medium text-aurora-fg">
            Descrição
            <textarea
              className={`${inputClass} mt-1 min-h-[100px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que aconteceu? O que você esperava?"
              maxLength={5000}
              data-testid="debug-report-description"
            />
            {fieldErrors.description ? (
              <span className="mt-1 block text-xs text-aurora-danger">{fieldErrors.description}</span>
            ) : null}
          </label>
          <label className="block text-sm font-medium text-aurora-fg">
            Observações
            <textarea
              className={`${inputClass} mt-1 min-h-[80px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Passos para reproduzir, contexto extra (opcional)"
              maxLength={2000}
              data-testid="debug-report-notes"
            />
          </label>
        </form>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-aurora-border bg-aurora-surface-2">
            {screenshotDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshotDataUrl}
                alt="Captura da tela"
                className="aspect-video w-full object-contain"
                data-testid="debug-report-screenshot"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-aurora-muted">
                Sem captura
              </div>
            )}
          </div>
          <p className="text-xs text-aurora-muted">Captura automática ao abrir</p>
          <details className="rounded-md border border-aurora-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm text-aurora-fg">
              <span>Registro: {sessionLog.length} eventos</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </summary>
            <pre className="max-h-32 overflow-auto border-t border-aurora-border bg-aurora-surface-2 p-2 text-[11px] leading-relaxed text-aurora-muted">
              {sessionLog.length > 0
                ? sessionLog.map((event) => `[${event.ts}] ${event.type}: ${event.message}`).join("\n")
                : "Nenhum evento registrado nesta sessão."}
            </pre>
          </details>
        </div>
      </div>
    </AuroraModal>
  );
}
