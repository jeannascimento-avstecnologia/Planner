"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { inputBoardClassSm } from "@/lib/ui-classes";

export type LinkedTicketOption = { value: string; label: string };

type Props = {
  value: string | null;
  options: LinkedTicketOption[];
  onChange: (value: string | null) => void;
};

const PRESETS: LinkedTicketOption[] = [
  { value: "linked", label: "Com chamado" },
  { value: "unlinked", label: "Sem chamado" },
];

export function TifluxTicketFilterCombobox({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = [...PRESETS, ...options];
  const filtered = query.trim()
    ? allOptions.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : allOptions;

  const selected = allOptions.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-[10rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 ${inputBoardClassSm}`}
        data-testid="tiflux-ticket-filter"
      >
        <span className={selected ? "truncate text-aurora-fg" : "text-aurora-muted"}>
          {selected ? selected.label : "Ticket Tiflux"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-aurora-muted" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[12rem] rounded-lg border border-board-border bg-board-surface p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar ticket..."
            className={inputBoardClassSm}
          />
          <ul className="mt-2 max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-1 text-xs text-aurora-muted">Nenhum resultado.</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value === value ? null : o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-board-accent-muted/50 ${
                      value === o.value ? "bg-board-accent-muted font-medium" : ""
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-aurora-muted hover:bg-board-accent-muted/40"
            >
              <X className="h-3 w-3" /> Limpar filtro
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
