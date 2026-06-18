"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectsGridView } from "./projects-grid-view";
import { ProjectsListView } from "./projects-list-view";
import { ProjectsViewSwitcher, parseProjectsLayout } from "./projects-view-switcher";
import { useProjectHubSelect } from "./projects-hub-shell";
import type { ProjectBoardRow } from "./types";
import type { BoardMember } from "@/components/board/share-project-panel";

type Props = {
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  isOrgAdmin: boolean;
  hubMode?: boolean;
  currentUserId?: string | null;
};

function ProjectsViewsInner({ boards, boardMembersByBoardId, isOrgAdmin, hubMode = true, currentUserId }: Props) {
  const searchParams = useSearchParams();
  const layout = parseProjectsLayout(searchParams.get("layout"));
  const { selectedBoardId, selectBoard } = useProjectHubSelect();

  const viewProps = {
    boards,
    boardMembersByBoardId,
    isOrgAdmin,
    hubMode,
    currentUserId,
    selectedBoardId,
    onSelectBoard: selectBoard,
  };

  return (
    <div className="space-y-3">
      <ProjectsViewSwitcher value={layout} />
      {layout === "list" ? <ProjectsListView {...viewProps} /> : <ProjectsGridView {...viewProps} />}
    </div>
  );
}

export function ProjectsViews(props: Props) {
  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando projetos...</div>}>
      <ProjectsViewsInner {...props} />
    </Suspense>
  );
}
