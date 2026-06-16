"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DEFAULT_BOARD_ICON, ICON_NAMES, getBoardIcon } from "@/lib/icon-catalog";

type Props = {
  name: string;
  defaultValue?: string;
  color?: string;
};

export function IconPicker({ name, defaultValue = DEFAULT_BOARD_ICON, color }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const Current = getBoardIcon(value);

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher icone"
        className="flex items-center gap-2 rounded-md border border-aurora-border bg-aurora-surface px-2 py-1.5 text-sm text-aurora-fg hover:bg-aurora-accent-muted/30"
      >
        <Current className="h-4 w-4" style={color ? { color } : undefined} />
        <ChevronDown className="h-3 w-3 text-aurora-muted" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 grid max-h-56 w-64 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-aurora-border bg-aurora-surface p-2 shadow-lg">
          {ICON_NAMES.map((n) => {
            const I = getBoardIcon(n);
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
        </div>
      ) : null}
    </div>
  );
}
