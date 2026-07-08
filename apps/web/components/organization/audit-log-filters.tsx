"use client";

import { useMemo, useState } from "react";
import { auditEventLabel } from "@/lib/audit/audit-labels";
import { ALL_AUDIT_FILTER_TYPES, AUDIT_FILTER_GROUPS } from "@/lib/audit/audit-filter-groups";
import { btnPrimary, btnSecondary, dataPanelClass, inputClassSm } from "@/lib/ui-classes";

export type AuditFilterValues = {
  type: string;
  types: string[];
  actor: string;
  from: string;
  to: string;
};

type MemberOption = { userId: string; name: string };

type Props = {
  values: AuditFilterValues;
  members: MemberOption[];
};

function initialSelectedTypes(values: AuditFilterValues): Set<string> {
  return new Set([...values.types, ...(values.type ? [values.type] : [])].filter(Boolean));
}

export function AuditLogFilters({ values, members }: Props) {
  const [selectedTypes, setSelectedTypes] = useState(() => initialSelectedTypes(values));

  const selectedList = useMemo(() => [...selectedTypes], [selectedTypes]);

  function toggleType(eventType: string, checked: boolean) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(eventType);
      else next.delete(eventType);
      return next;
    });
  }

  function selectAll(types: readonly string[]) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      for (const t of types) next.add(t);
      return next;
    });
  }

  function clearGroup(types: readonly string[]) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      for (const t of types) next.delete(t);
      return next;
    });
  }

  function selectAllTypes() {
    setSelectedTypes(new Set(ALL_AUDIT_FILTER_TYPES));
  }

  function clearAllTypes() {
    setSelectedTypes(new Set());
  }

  return (
    <form
      className={`${dataPanelClass} space-y-5 p-4 md:p-5`}
      method="get"
      data-testid="audit-log-filters"
    >
      <div>
        <h3 className="text-sm font-semibold text-aurora-fg">Filtros</h3>
        <p className="text-xs text-aurora-muted">Refine o historico por pessoa, periodo e tipo de acao.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-filter-actor" className="text-xs font-medium text-aurora-fg">
            Quem fez a acao
          </label>
          <select
            id="audit-filter-actor"
            name="actor"
            defaultValue={values.actor}
            className={inputClassSm}
            data-testid="audit-filter-actor"
          >
            <option value="">Todas as pessoas</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-filter-from" className="text-xs font-medium text-aurora-fg">
            A partir de
          </label>
          <input
            id="audit-filter-from"
            name="from"
            type="datetime-local"
            defaultValue={values.from}
            className={inputClassSm}
            data-testid="audit-filter-from"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-filter-to" className="text-xs font-medium text-aurora-fg">
            Ate
          </label>
          <input
            id="audit-filter-to"
            name="to"
            type="datetime-local"
            defaultValue={values.to}
            className={inputClassSm}
            data-testid="audit-filter-to"
          />
        </div>

        <div className="flex items-end">
          <button type="submit" className={`${btnPrimary} w-full md:w-auto`} data-testid="audit-filter-submit">
            Aplicar filtros
          </button>
        </div>
      </div>

      <fieldset className="space-y-4" data-testid="audit-filter-event-types">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <legend className="text-xs font-medium text-aurora-fg">Tipos de evento</legend>
            <p className="text-xs text-aurora-muted">
              Selecione um ou mais. Deixe vazio para ver todos os tipos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${btnSecondary} text-xs`}
              onClick={selectAllTypes}
              data-testid="audit-filter-select-all"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              className={`${btnSecondary} text-xs`}
              onClick={clearAllTypes}
              data-testid="audit-filter-clear-all"
            >
              Limpar selecao
            </button>
          </div>
        </div>

        {selectedList.map((t) => (
          <input key={t} type="hidden" name="types" value={t} />
        ))}

        <div className="grid gap-4 lg:grid-cols-2">
          {AUDIT_FILTER_GROUPS.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-aurora-border bg-aurora-surface-2/40 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-aurora-muted">{group.label}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-aurora-accent hover:underline"
                    onClick={() => selectAll(group.types)}
                  >
                    Todos
                  </button>
                  <span className="text-aurora-muted">·</span>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-aurora-muted hover:text-aurora-fg hover:underline"
                    onClick={() => clearGroup(group.types)}
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.types.map((eventType) => {
                  const checked = selectedTypes.has(eventType);
                  return (
                    <label
                      key={eventType}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        checked
                          ? "border-aurora-brand/40 bg-aurora-brand-muted/50 text-aurora-brand"
                          : "border-aurora-border bg-aurora-surface text-aurora-muted hover:border-aurora-brand/30 hover:text-aurora-fg"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleType(eventType, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-aurora-border text-aurora-brand focus:ring-aurora-brand/30"
                      />
                      {auditEventLabel(eventType)}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </form>
  );
}

export function buildAuditFilterQuery(values: AuditFilterValues): string {
  const params = new URLSearchParams();
  if (values.actor) params.set("actor", values.actor);
  const types = [...new Set([...values.types, ...(values.type ? [values.type] : [])].filter(Boolean))];
  for (const t of types) params.append("types", t);
  if (values.from) params.set("from", values.from);
  if (values.to) params.set("to", values.to);
  return params.toString();
}
