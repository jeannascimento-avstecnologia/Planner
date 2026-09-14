"use client";

import { useEffect, useMemo, useState } from "react";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { btnBoardPrimary, btnBoardSecondary } from "@/lib/ui-classes";
import { computeScheduleFromRange } from "@/lib/timeline-schedule";

type Props = {
  open: boolean;
  cardTitle: string;
  initialStartYmd: string;
  initialEndYmd: string;
  pending: boolean;
  onSave: (startYmd: string, endYmd: string) => void;
  onCancel: () => void;
};

export function TimelinePeriodModal({
  open,
  cardTitle,
  initialStartYmd,
  initialEndYmd,
  pending,
  onSave,
  onCancel,
}: Props) {
  const [startYmd, setStartYmd] = useState(initialStartYmd);
  const [endYmd, setEndYmd] = useState(initialEndYmd);

  useEffect(() => {
    if (!open) return;
    setStartYmd(initialStartYmd);
    setEndYmd(initialEndYmd);
  }, [open, initialStartYmd, initialEndYmd]);

  const validation = useMemo(
    () => computeScheduleFromRange(startYmd, endYmd),
    [startYmd, endYmd],
  );
  const error = validation.ok ? null : validation.message;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-testid="timeline-period-start"] input[type="text"]',
      );
      el?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <AuroraModal
      open={open}
      onClose={onCancel}
      title="Definir periodo"
      subtitle={cardTitle}
      variant="board"
      size="sm"
      testId="timeline-period-modal"
      zIndex={180}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-testid="timeline-period-cancel"
            onClick={onCancel}
            disabled={pending}
            className={btnBoardSecondary}
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="timeline-period-save"
            onClick={() => {
              if (!validation.ok) return;
              onSave(startYmd, endYmd);
            }}
            disabled={pending || !validation.ok}
            className={btnBoardPrimary}
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validation.ok) return;
          onSave(startYmd, endYmd);
        }}
      >
        <div data-testid="timeline-period-start">
          <label className="mb-1 block text-xs font-medium text-aurora-muted">Inicio</label>
          <DatePickerPopover
            name="timelineStart"
            defaultValue={startYmd}
            placeholder="Data de inicio"
            clearLabel="Limpar inicio"
            variant="board"
            zIndex={220}
            onChange={setStartYmd}
          />
        </div>
        <div data-testid="timeline-period-end">
          <label className="mb-1 block text-xs font-medium text-aurora-muted">Fim</label>
          <DatePickerPopover
            name="timelineEnd"
            defaultValue={endYmd}
            placeholder="Data de fim"
            clearLabel="Limpar fim"
            variant="board"
            zIndex={220}
            onChange={setEndYmd}
          />
        </div>
        {error ? (
          <p
            data-testid="timeline-period-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-aurora-danger"
          >
            {error}
          </p>
        ) : null}
      </form>
    </AuroraModal>
  );
}
