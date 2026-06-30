"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateLabel,
  getMonthGrid,
  getTrailingPadCount,
  shiftMonth,
  toDateInputValue,
} from "@/lib/calendar-grid";
import {
  formatBrazilianDateInput,
  isoToBrazilianDisplay,
  parseBrazilianDate,
} from "@/lib/parse-date-br";
import { computeFixedPopoverPosition } from "@/lib/popover-position";
import { btnBoardSecondary, btnSecondary, inputBoardClassSm, inputClass, inputOverdueClass } from "@/lib/ui-classes";
import { AuroraPopover } from "@/components/ui/aurora-popover";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  clearLabel?: string;
  onChange?: (value: string) => void;
  variant?: "global" | "board";
  overdue?: boolean;
};

const PANEL_W = 256;
const PANEL_H = 280;

export function DatePickerPopover({
  name,
  defaultValue = "",
  placeholder = "Adicionar prazo",
  clearLabel = "Limpar prazo",
  onChange,
  variant = "global",
  overdue = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [textValue, setTextValue] = useState(() =>
    defaultValue ? isoToBrazilianDisplay(defaultValue) : "",
  );
  const [textError, setTextError] = useState(false);
  const initial = defaultValue ? new Date(defaultValue + "T12:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const board = variant === "board";
  const borderCls = board ? "border-board-border" : "border-aurora-border";
  const surfaceCls = board ? "bg-board-surface" : "bg-aurora-surface";
  const accentCls = board ? "text-board-accent" : "text-aurora-accent";
  const accentBgCls = board ? "bg-board-accent" : "bg-aurora-accent";
  const accentMutedCls = board ? "hover:bg-board-accent-muted" : "hover:bg-aurora-accent-muted";
  const accentMuted30Cls = board ? "hover:bg-board-accent-muted/30" : "hover:bg-aurora-accent-muted/30";
  const ringCls = board ? "ring-board-accent" : "ring-aurora-accent";
  const clearBtnCls = board ? btnBoardSecondary : btnSecondary;
  const inputCls = board ? inputBoardClassSm : inputClass;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = computeFixedPopoverPosition(rect, PANEL_W, PANEL_H);
    setPos({ top: next.top, left: next.left, flip: next.flipVertical });
  }, []);

  useEffect(() => {
    setValue(defaultValue);
    setTextValue(defaultValue ? isoToBrazilianDisplay(defaultValue) : "");
    setTextError(false);
  }, [defaultValue]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() {
      updatePosition();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updatePosition]);

  function applyIso(iso: string) {
    setValue(iso);
    setTextValue(iso ? isoToBrazilianDisplay(iso) : "");
    setTextError(false);
    onChange?.(iso);
  }

  const grid = getMonthGrid(new Date(viewYear, viewMonth, 1));
  const trailing = getTrailingPadCount(grid.firstDayOfWeek, grid.daysInMonth);
  const today = new Date();
  const todayStr = toDateInputValue(today.getFullYear(), today.getMonth(), today.getDate());

  function pick(day: number) {
    const iso = toDateInputValue(viewYear, viewMonth, day);
    applyIso(iso);
    setOpen(false);
  }

  function clear() {
    applyIso("");
    setOpen(false);
  }

  function commitTextInput(raw: string) {
    if (!raw.trim()) {
      applyIso("");
      return;
    }
    const iso = parseBrazilianDate(raw);
    if (!iso) {
      setTextError(true);
      return;
    }
    applyIso(iso);
  }

  function handleTextBlur() {
    commitTextInput(textValue);
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTextInput(textValue);
    }
  }

  const panel = open ? (
    <AuroraPopover
      open
      variant={variant === "board" ? "board" : "app"}
      testId="date-picker-popover"
      zIndex={100}
      style={{ top: pos.top, left: pos.left, width: PANEL_W }}
      className="p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={panelRef} role="dialog" aria-label="Calendario">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => {
            const n = shiftMonth(viewYear, viewMonth, -1);
            setViewYear(n.year);
            setViewMonth(n.month);
          }}
          className={`rounded p-1 ${accentMutedCls}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium capitalize text-aurora-fg">{grid.monthLabel}</span>
        <button
          type="button"
          aria-label="Proximo mes"
          onClick={() => {
            const n = shiftMonth(viewYear, viewMonth, 1);
            setViewYear(n.year);
            setViewMonth(n.month);
          }}
          className={`rounded p-1 ${accentMutedCls}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-aurora-muted">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-0.5 font-medium">
            {d}
          </div>
        ))}
        {Array.from({ length: grid.firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: grid.daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = toDateInputValue(viewYear, viewMonth, day);
          const isSelected = value === iso;
          const isToday = iso === todayStr;
          return (
            <button
              key={day}
              type="button"
              onClick={() => pick(day)}
              className={`rounded py-1 text-xs ${accentMutedCls} ${
                isSelected ? `${accentBgCls} text-white` : isToday ? `ring-1 ${ringCls}` : ""
              }`}
            >
              {day}
            </button>
          );
        })}
        {Array.from({ length: trailing }).map((_, i) => (
          <div key={`trail-${i}`} />
        ))}
      </div>
      {value ? (
        <button type="button" onClick={clear} className={`mt-2 w-full text-xs ${clearBtnCls}`}>
          {clearLabel}
        </button>
      ) : null}
      </div>
    </AuroraPopover>
  ) : null;

  const fieldErrorCls = textError ? "border-aurora-danger ring-1 ring-aurora-danger" : "";
  const fieldOverdueCls = overdue && !textError ? inputOverdueClass : "";

  return (
    <div className="relative flex gap-1">
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD.MM.AAAA"
        value={textValue}
        onChange={(e) => {
          setTextError(false);
          setTextValue(formatBrazilianDateInput(e.target.value));
        }}
        onBlur={handleTextBlur}
        onKeyDown={handleTextKeyDown}
        className={`${inputCls} min-w-0 flex-1 ${fieldErrorCls} ${fieldOverdueCls}`}
        aria-label={placeholder}
        data-overdue={overdue ? "true" : undefined}
      />
      <button
        ref={triggerRef}
        type="button"
        aria-label={value ? `Prazo: ${formatDateLabel(value)}` : placeholder}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(updatePosition, 0);
        }}
        className={`flex shrink-0 items-center justify-center rounded-md border px-2 py-1.5 ${accentMuted30Cls} ${
          overdue
            ? `border-2 border-aurora-danger ring-2 ring-aurora-danger/40 ${surfaceCls}`
            : `${borderCls} ${surfaceCls}`
        }`}
      >
        <Calendar className={`h-4 w-4 ${accentCls}`} />
      </button>
      {panel}
    </div>
  );
}
