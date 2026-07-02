"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectsGridView } from "@/components/projects/projects-grid-view";
import { ProjectsListView } from "@/components/projects/projects-list-view";
import { ProjectsViewSwitcher, parseProjectsLayout } from "@/components/projects/projects-view-switcher";
import type { OrgProjectSection } from "@/lib/load-org-projects";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import type { BoardMember } from "@/components/board/share-project-panel";

type Props = {
  sections: OrgProjectSection[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  currentUserId?: string | null;
};

function HomeProjectsGroupedInner({ sections, boardMembersByBoardId, currentUserId }: Props) {
  const searchParams = useSearchParams();
  const layout = parseProjectsLayout(searchParams.get("layout"));

  return (
    <div className="space-y-6">
      <ProjectsViewSwitcher value={layout} />
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
              <OrgLogo name={section.orgName} logoUrl={section.logoUrl} size="sm" />
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
            ) : layout === "list" ? (
              <ProjectsListView
                boards={section.boards}
                boardMembersByBoardId={boardMembersByBoardId}
                isOrgAdmin={section.isOrgAdmin}
                hubMode={false}
                currentUserId={currentUserId}
              />
            ) : (
              <ProjectsGridView
                boards={section.boards}
                boardMembersByBoardId={boardMembersByBoardId}
                isOrgAdmin={section.isOrgAdmin}
                hubMode={false}
                currentUserId={currentUserId}
              />
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
