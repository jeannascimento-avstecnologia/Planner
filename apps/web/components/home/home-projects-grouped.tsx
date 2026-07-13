"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useClientSearchParamState } from "@/lib/client-url-state";
import { ProjectsGridView } from "@/components/projects/projects-grid-view";
import { ProjectsListView } from "@/components/projects/projects-list-view";
import {
  ProjectsViewSwitcher,
  parseProjectsLayout,
  projectsLayoutToParam,
} from "@/components/projects/projects-view-switcher";
import { DepartmentIcon } from "@/components/departments/DepartmentIcon";
import type { OrgProjectSection } from "@/lib/load-org-projects";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import type { BoardMember } from "@/components/board/share-project-panel";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { departmentGroupBackground, readThemeMode, type ThemeMode } from "@/lib/board-theme";

type Props = {
  sections: OrgProjectSection[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  currentUserId?: string | null;
};

function HomeProjectsGroupedInner({ sections, boardMembersByBoardId, currentUserId }: Props) {
  const [layout, setLayout] = useClientSearchParamState(
    "layout",
    parseProjectsLayout,
    projectsLayoutToParam,
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setThemeMode(readThemeMode());
    const obs = new MutationObserver(() => setThemeMode(readThemeMode()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const activeSection = sections.find((s) => s.isActive) ?? sections[0];
  const filterOptions = useMemo(() => {
    if (!activeSection) return [];
    return [
      { id: "all", label: "Todos" },
      ...activeSection.departmentGroups.map((g) => ({
        id: g.departmentId ?? "general",
        label: g.name,
      })),
    ];
  }, [activeSection]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function matchesFilter(departmentId: string | null): boolean {
    if (deptFilter === "all") return true;
    if (deptFilter === "general") return !departmentId;
    return departmentId === deptFilter;
  }

  return (
    <div className="space-y-6">
      <div data-tour="home-view-switcher">
        <ProjectsViewSwitcher value={layout} onChange={setLayout} />
      </div>

      {activeSection && filterOptions.length > 1 ? (
        <div className="flex flex-wrap gap-2" data-testid="home-dept-filter">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDeptFilter(opt.id)}
              className={
                btnBoardSecondary +
                " text-xs " +
                (deptFilter === opt.id ? "border-aurora-accent text-aurora-accent" : "")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {sections.length === 0 ? (
        <p className="text-sm text-aurora-muted">Nenhum projeto ainda. Crie o primeiro acima.</p>
      ) : (
        sections.map((section) => (
          <section
            key={section.orgId}
            className="space-y-3 rounded-xl border border-aurora-border bg-aurora-surface p-4"
            data-testid={`home-org-section-${section.orgId}`}
          >
            <header className="flex flex-wrap items-center gap-2 border-b border-aurora-border pb-3">
              <OrgLogo name={section.orgName} logoUrl={section.logoUrl} size="md" />
              <h3 className="text-base font-semibold text-aurora-fg">{section.orgName}</h3>
              {section.isActive ? (
                <span
                  className="rounded-full border border-aurora-success/40 bg-aurora-success/10 px-2 py-0.5 text-xs text-aurora-success"
                  data-testid={`home-org-active-${section.orgId}`}
                >
                  Org ativa
                </span>
              ) : null}
              <span className="text-xs text-aurora-muted">
                {section.boards.length} projeto{section.boards.length === 1 ? "" : "s"}
              </span>
            </header>

            {section.boards.length === 0 ? (
              <p className="text-sm text-aurora-muted">Nenhum projeto nesta organizacao.</p>
            ) : (
              <div className="space-y-4">
                {section.departmentGroups
                  .filter((g) => matchesFilter(g.departmentId))
                  .map((group) => {
                    const groupKey = `${section.orgId}:${group.departmentId ?? "general"}`;
                    const isCollapsed = collapsed[groupKey] ?? false;
                    const pastelBg =
                      group.departmentId && group.color
                        ? departmentGroupBackground(group.color, themeMode)
                        : null;
                    return (
                      <div
                        key={groupKey}
                        className="space-y-2 rounded-lg border border-transparent p-3"
                        style={
                          pastelBg
                            ? {
                                backgroundColor: pastelBg,
                                borderColor: group.color ? `${group.color}33` : undefined,
                              }
                            : undefined
                        }
                        data-testid={`home-dept-group-${groupKey}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-aurora-surface-2"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-aurora-muted" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-aurora-muted" />
                          )}
                          {group.departmentId ? (
                            <DepartmentIcon icon={group.icon} color={group.color} size="sm" />
                          ) : null}
                          <span className="font-medium text-aurora-fg">{group.name}</span>
                          {!group.hasAccess && group.departmentId ? (
                            <span className="rounded-full bg-aurora-surface-2 px-2 py-0.5 text-xs text-aurora-muted">
                              Sem acesso
                            </span>
                          ) : null}
                          <span className="text-xs text-aurora-muted">
                            {group.boards.length} projeto{group.boards.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        {!isCollapsed ? (
                          group.boards.length === 0 ? (
                            <p className="pl-6 text-sm text-aurora-muted">Nenhum projeto neste departamento.</p>
                          ) : layout === "list" ? (
                            <ProjectsListView
                              boards={group.boards}
                              boardMembersByBoardId={boardMembersByBoardId}
                              isOrgAdmin={section.isOrgAdmin}
                              hubMode={false}
                              currentUserId={currentUserId}
                            />
                          ) : (
                            <ProjectsGridView
                              boards={group.boards}
                              boardMembersByBoardId={boardMembersByBoardId}
                              isOrgAdmin={section.isOrgAdmin}
                              hubMode={false}
                              currentUserId={currentUserId}
                            />
                          )
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

export function HomeProjectsGrouped(props: Props) {
  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando projetos...</div>}>
      <HomeProjectsGroupedInner {...props} />
    </Suspense>
  );
}
