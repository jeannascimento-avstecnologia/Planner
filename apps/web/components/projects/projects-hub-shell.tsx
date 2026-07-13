"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useClientSearchParamState } from "@/lib/client-url-state";
import { DeadlineTiles, type DeadlineTileItem } from "@/components/home/deadline-tiles";
import type { BoardMember } from "@/components/board/share-project-panel";
import { ProjectHubDetail, type UpcomingTask } from "./project-hub-detail";
import { ProjectSettingsModal } from "./project-settings-modal";
import type { ProjectBoardRow } from "./types";

type Props = {
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  isOrgAdmin: boolean;
  currentUserId: string | null;
  upcomingTasksByBoard: Record<string, UpcomingTask[]>;
  children: React.ReactNode;
  showDeadlines?: boolean;
  deadlineItems?: DeadlineTileItem[];
  basePath?: string;
};

function parseBoardParam(raw: string | null): string | null {
  return raw;
}

function boardParamToUrl(raw: string | null): string | null {
  return raw;
}

function ProjectsHubLayoutInner({
  boards,
  boardMembersByBoardId,
  isOrgAdmin,
  currentUserId,
  upcomingTasksByBoard,
  children,
  showDeadlines = false,
  deadlineItems = [],
}: Props) {
  const [selectedBoardId, setSelectedBoardId] = useClientSearchParamState(
    "board",
    parseBoardParam,
    boardParamToUrl,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  );

  const filteredDeadlines = useMemo(() => {
    if (!showDeadlines) return [];
    if (!selectedBoardId) return deadlineItems;
    return deadlineItems.filter((d) => d.board_id === selectedBoardId);
  }, [deadlineItems, selectedBoardId, showDeadlines]);

  const userBoardRole = useMemo(() => {
    if (!selectedBoardId || !currentUserId) return null;
    const members = boardMembersByBoardId[selectedBoardId] ?? [];
    return members.find((m) => m.user_id === currentUserId)?.role ?? null;
  }, [boardMembersByBoardId, currentUserId, selectedBoardId]);

  const clearSelection = useCallback(() => {
    setSelectedBoardId(null);
  }, [setSelectedBoardId]);

  return (
    <>
      {showDeadlines ? (
        <DeadlineTiles
          items={filteredDeadlines}
          subtitle={selectedBoard ? `Projeto: ${selectedBoard.name}` : undefined}
        />
      ) : null}
      <div className={selectedBoard ? "grid items-start gap-6 lg:grid-cols-2" : "space-y-3"}>
        <div className="space-y-3" data-tour="projects-grid">
          {children}
        </div>
        {selectedBoard ? (
          <div data-tour="projects-detail">
            <ProjectHubDetail
            board={selectedBoard}
            members={boardMembersByBoardId[selectedBoard.id] ?? []}
            upcomingTasks={upcomingTasksByBoard[selectedBoard.id] ?? []}
            isOrgAdmin={isOrgAdmin}
            userBoardRole={userBoardRole}
            onClearSelection={clearSelection}
            onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        ) : null}
      </div>
      {selectedBoard && settingsOpen ? (
        <ProjectSettingsModal
          board={selectedBoard}
          members={boardMembersByBoardId[selectedBoard.id] ?? []}
          isOrgAdmin={isOrgAdmin}
          currentUserId={currentUserId}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ProjectsHubLayout(props: Props) {
  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando...</div>}>
      <ProjectsHubLayoutInner {...props} />
    </Suspense>
  );
}

export function useProjectHubSelect() {
  const [selectedBoardId, setSelectedBoardId] = useClientSearchParamState(
    "board",
    parseBoardParam,
    boardParamToUrl,
  );

  const selectBoard = useCallback(
    (id: string) => {
      setSelectedBoardId(id);
    },
    [setSelectedBoardId],
  );

  return { selectedBoardId, selectBoard };
}
