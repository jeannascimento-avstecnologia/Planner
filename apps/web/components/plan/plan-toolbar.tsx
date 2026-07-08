"use client";

import { inputClassSm, toolbarStripClass } from "@/lib/ui-classes";
import { OrgLogo } from "@/components/organizations/OrgLogo";

type BoardOption = { id: string; name: string };
type OrgOption = { id: string; name: string; logoUrl?: string | null };

type Props = {
  orgs: OrgOption[];
  orgFilter: string;
  onOrgFilterChange: (orgId: string) => void;
  boards: BoardOption[];
  boardFilter: string;
  onBoardFilterChange: (boardId: string) => void;
  showWeekends: boolean;
  onShowWeekendsChange: (show: boolean) => void;
};

export function PlanToolbar({
  orgs,
  orgFilter,
  onOrgFilterChange,
  boards,
  boardFilter,
  onBoardFilterChange,
  showWeekends,
  onShowWeekendsChange,
}: Props) {
  const selectedOrg = orgFilter ? orgs.find((o) => o.id === orgFilter) : null;

  return (
    <div className={toolbarStripClass} data-testid="plan-toolbar">
      <div className="flex flex-wrap items-center gap-3">
        {selectedOrg ? (
          <div className="flex items-center gap-2 pr-1" data-testid="plan-toolbar-org-logo">
            <OrgLogo name={selectedOrg.name} logoUrl={selectedOrg.logoUrl} size="xs" />
            <span className="text-sm font-medium text-aurora-fg">{selectedOrg.name}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <label htmlFor="plan-org-filter" className="text-xs font-medium uppercase tracking-wide text-aurora-muted">
            Organizacao
          </label>
          <select
            id="plan-org-filter"
            value={orgFilter}
            onChange={(e) => onOrgFilterChange(e.target.value)}
            className={inputClassSm + " min-w-[12rem]"}
            data-testid="plan-org-filter"
          >
            <option value="">Todas as organizacoes</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="plan-board-filter" className="text-xs font-medium uppercase tracking-wide text-aurora-muted">
            Projeto
          </label>
          <select
            id="plan-board-filter"
            value={boardFilter}
            onChange={(e) => onBoardFilterChange(e.target.value)}
            className={inputClassSm + " min-w-[10rem]"}
            data-testid="plan-board-filter"
          >
            <option value="">Todos os projetos</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface-2/50 px-3 py-1.5 text-sm text-aurora-muted">
          <input
            type="checkbox"
            checked={showWeekends}
            onChange={(e) => onShowWeekendsChange(e.target.checked)}
            className="h-4 w-4 rounded border-aurora-border text-aurora-brand"
            data-testid="plan-show-weekends"
          />
          Exibir sabados e domingos
        </label>
      </div>
    </div>
  );
}
