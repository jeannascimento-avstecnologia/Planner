"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setActiveOrgAction } from "@/app/(app)/settings/organizations/actions";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import {
  btnSecondary,
  dataPanelClass,
  inputClassSm,
} from "@/lib/ui-classes";
import { toast } from "sonner";
import type { DeptFilterOption } from "@/lib/filter-projects-boards";
import { countActiveProjectFilters } from "@/lib/filter-projects-boards";

type OrgOption = { orgId: string; name: string; logoUrl: string | null };

type Props = {
  orgs: OrgOption[];
  activeOrgId: string;
  deptOptions: DeptFilterOption[];
};

export function ProjectsFiltersPanel({ orgs, activeOrgId, deptOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const dept = searchParams.get("dept") ?? "all";
  const q = searchParams.get("q") ?? "";
  const archived = searchParams.get("archived") === "1";
  const sort = searchParams.get("sort") === "recent" ? "recent" : "name";

  const selectedOrg = orgs.find((o) => o.orgId === activeOrgId);
  const activeFilterCount = countActiveProjectFilters({
    dept: dept === "all" ? undefined : dept,
    q,
    archived: archived ? "1" : undefined,
    sort: sort === "recent" ? "recent" : undefined,
  });

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onOrgChange(orgId: string) {
    if (!orgId || orgId === activeOrgId) return;
    startTransition(async () => {
      const res = await setActiveOrgAction(orgId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
      router.push("/projects");
    });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className={`${dataPanelClass} space-y-4 p-4 md:p-5`} data-testid="projects-filter-bar">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-aurora-fg">Filtros</h3>
          <p className="text-xs text-aurora-muted">
            Escolha organizacao e departamento para refinar a lista de projetos.
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            className={`${btnSecondary} text-xs`}
            onClick={clearFilters}
            data-testid="projects-clear-filters"
          >
            Limpar filtros ({activeFilterCount})
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="projects-org-select" className="text-xs font-medium text-aurora-fg">
            Organizacao
          </label>
          <div className="flex items-center gap-2">
            {selectedOrg ? (
              <OrgLogo name={selectedOrg.name} logoUrl={selectedOrg.logoUrl} size="xs" />
            ) : null}
            {orgs.length <= 1 ? (
              <span className="text-sm font-medium text-aurora-fg">{selectedOrg?.name ?? "—"}</span>
            ) : (
              <select
                id="projects-org-select"
                value={activeOrgId}
                disabled={pending}
                onChange={(e) => onOrgChange(e.target.value)}
                className={`${inputClassSm} min-w-0 flex-1`}
                data-testid="projects-org-select"
              >
                {orgs.map((o) => (
                  <option key={o.orgId} value={o.orgId}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="projects-dept-select" className="text-xs font-medium text-aurora-fg">
            Departamento
          </label>
          <select
            id="projects-dept-select"
            value={dept}
            onChange={(e) => updateParams({ dept: e.target.value === "all" ? null : e.target.value })}
            className={inputClassSm}
            data-testid="projects-dept-select"
          >
            {deptOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="projects-sort" className="text-xs font-medium text-aurora-fg">
            Ordenar por
          </label>
          <select
            id="projects-sort"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value === "name" ? null : e.target.value })}
            className={inputClassSm}
            data-testid="projects-sort"
          >
            <option value="name">Nome (A–Z)</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-aurora-border pt-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor="projects-search" className="sr-only">
            Buscar projeto
          </label>
          <input
            id="projects-search"
            type="search"
            defaultValue={q}
            key={`q-${q}`}
            onBlur={(e) => updateParams({ q: e.target.value.trim() || null })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateParams({ q: (e.target as HTMLInputElement).value.trim() || null });
              }
            }}
            placeholder="Buscar por nome do projeto..."
            className={`${inputClassSm} w-full`}
            data-testid="projects-search"
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface-2/50 px-3 py-2 text-sm text-aurora-muted">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => updateParams({ archived: e.target.checked ? "1" : null })}
            className="h-4 w-4 rounded border-aurora-border text-aurora-brand"
            data-testid="projects-show-archived"
          />
          Incluir arquivados
        </label>
      </div>
    </div>
  );
}
