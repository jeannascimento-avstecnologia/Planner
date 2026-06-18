"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { searchTifluxOptions } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm } from "@/lib/ui-classes";

export type TifluxOption = { value: string; label: string; email?: string };

type Kind = "client" | "desk" | "priority" | "services_catalog_item" | "requestor" | "user" | "parent_ticket";

type BaseProps = {
  boardId: string;
  kind: Kind;
  deskId?: number;
  clientId?: number;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
};

type SingleProps = BaseProps & {
  multi?: false;
  value: TifluxOption | null;
  onChange: (option: TifluxOption | null) => void;
};

type MultiProps = BaseProps & {
  multi: true;
  value: TifluxOption[];
  onChange: (options: TifluxOption[]) => void;
};

type Props = SingleProps | MultiProps;

export function TifluxCombobox(props: Props) {
  const { boardId, kind, deskId, clientId, placeholder, disabled, disabledHint } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TifluxOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    (q: string) => {
      startTransition(async () => {
        const res = await searchTifluxOptions({ boardId, kind, query: q || undefined, deskId, clientId });
        if ("error" in res) {
          setError(res.error);
          setOptions([]);
        } else {
          setError(null);
          setOptions(res.options);
        }
      });
    },
    [boardId, kind, deskId, clientId],
  );

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(handle);
  }, [open, query, runSearch]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function selectOption(option: TifluxOption) {
    if (props.multi) {
      if (!props.value.some((o) => o.value === option.value)) {
        props.onChange([...props.value, option]);
      }
      setQuery("");
    } else {
      props.onChange(option);
      setOpen(false);
    }
  }

  const selectedSingle = !props.multi ? props.value : null;
  const selectedMulti = props.multi ? props.value : [];

  return (
    <div ref={containerRef} className="relative">
      {props.multi ? (
        <div className="flex flex-wrap gap-1">
          {selectedMulti.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded bg-board-accent-muted px-1.5 py-0.5 text-xs text-aurora-fg"
            >
              {o.label}
              <button
                type="button"
                aria-label={`Remover ${o.label}`}
                onClick={() => props.onChange(selectedMulti.filter((x) => x.value !== o.value))}
                className="text-aurora-muted hover:text-aurora-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 flex w-full items-center justify-between gap-2 ${inputBoardClassSm} ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className={selectedSingle ? "text-aurora-fg" : "text-aurora-muted"}>
          {disabled
            ? disabledHint ?? "Indisponivel"
            : selectedSingle
              ? selectedSingle.label
              : props.multi
                ? placeholder ?? "Pesquisar..."
                : placeholder ?? "Selecionar..."}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-aurora-muted" />
      </button>

      {open && !disabled ? (
        <div className="absolute z-[120] mt-1 w-full rounded-lg border border-board-border bg-board-surface p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para pesquisar"
            className={inputBoardClassSm}
          />
          <div className="mt-2 max-h-48 overflow-y-auto">
            {pending ? (
              <p className="flex items-center gap-2 px-2 py-2 text-xs text-aurora-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
              </p>
            ) : error ? (
              <p className="px-2 py-2 text-xs text-aurora-danger">{error}</p>
            ) : options.length === 0 ? (
              <p className="px-2 py-2 text-xs text-aurora-muted">Nenhum resultado.</p>
            ) : (
              <ul className="space-y-0.5">
                {options.map((o) => {
                  const isSelected = props.multi
                    ? selectedMulti.some((x) => x.value === o.value)
                    : selectedSingle?.value === o.value;
                  return (
                    <li key={o.value}>
                      <button
                        type="button"
                        onClick={() => selectOption(o)}
                        className={`w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-board-accent-muted/50 ${
                          isSelected ? "ring-1 ring-board-accent" : ""
                        }`}
                      >
                        {o.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {!props.multi && selectedSingle ? (
            <button
              type="button"
              onClick={() => {
                props.onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded px-2 py-1 text-left text-xs text-aurora-muted hover:bg-board-accent-muted/40"
            >
              Limpar selecao
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
