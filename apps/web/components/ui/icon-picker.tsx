"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const DEFAULT_ICON = "folder-kanban";
const DROPDOWN_MAX_H = 480;
const DROPDOWN_MIN_W = 320;

type Props = {
  name: string;
  defaultValue?: string;
  color?: string;
};

type CatalogModule = typeof import("@/lib/icon-catalog");

type DropdownPos = { top: number; left: number; width: number; maxHeight: number };

export function IconPicker({ name, defaultValue = DEFAULT_ICON, color }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogModule | null>(null);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || catalog) return;
    void import("@/lib/icon-catalog").then(setCatalog);
  }, [open, catalog]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePos() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const maxH = Math.min(window.innerHeight * 0.55, DROPDOWN_MAX_H);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;
      const height = Math.min(maxH, Math.max(available, 200));
      const top = openUp ? rect.top - height - 4 : rect.bottom + 4;
      setDropdownPos({
        top,
        left: rect.left,
        width: Math.max(rect.width, DROPDOWN_MIN_W),
        maxHeight: height,
      });
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const Current = catalog ? catalog.getBoardIcon(value) : null;

  const dropdown =
    open && catalog && dropdownPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            data-icon-picker-dropdown
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              zIndex: 200,
            }}
            className="grid grid-cols-10 gap-1 overflow-y-auto rounded-lg border border-aurora-border bg-aurora-surface p-2 shadow-lg"
          >
            {catalog.ICON_NAMES.map((n) => {
              const I = catalog.getBoardIcon(n);
              const on = n === value;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setValue(n);
                    setOpen(false);
                  }}
                  aria-label={n}
                  className={`flex h-7 w-7 items-center justify-center rounded hover:bg-aurora-accent-muted ${
                    on ? "bg-aurora-accent-muted text-aurora-accent" : "text-aurora-fg"
                  }`}
                >
                  <I className="h-4 w-4" />
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher icone"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-aurora-border bg-aurora-surface px-2 py-1.5 text-sm text-aurora-fg hover:bg-aurora-accent-muted/30"
      >
        {Current ? (
          <Current className="h-4 w-4" style={color ? { color } : undefined} />
        ) : (
          <span className="h-4 w-4 rounded bg-aurora-surface-2" />
        )}
        <ChevronDown className="h-3 w-3 text-aurora-muted" />
      </button>
      {dropdown}
    </div>
  );
}
