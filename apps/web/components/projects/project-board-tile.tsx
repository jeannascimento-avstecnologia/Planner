"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { BoardIcon } from "@/components/board/board-icon";
import { canEditBoardUI } from "@/lib/board-member-roles";
import { DEFAULT_BOARD_COLOR, tileInteractive, tileSelected } from "@/lib/ui-classes";
import type { BoardMember } from "@/components/board/share-project-panel";
import { ProjectSettingsModal } from "./project-settings-modal";
import type { ProjectBoardRow } from "./types";

type Props = {
  board: ProjectBoardRow;
  members: BoardMember[];
  isOrgAdmin: boolean;
  currentUserId?: string | null;
  variant?: "grid" | "list";
  hubMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export function ProjectBoardTile({
  board,
  members,
  isOrgAdmin,
  currentUserId,
  variant = "grid",
  hubMode = false,
  selected = false,
  onSelect,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tint = board.color || DEFAULT_BOARD_COLOR;
  const userBoardRole = members.find((m) => m.user_id === currentUserId)?.role ?? null;
  const canEdit = canEditBoardUI(isOrgAdmin, userBoardRole);

  const openBoard = (e: React.MouseEvent) => {
    if (hubMode && onSelect) {
      e.preventDefault();
      onSelect(board.id);
    }
  };

  if (variant === "list") {
    const nameContent = (
      <>
        <BoardIcon icon={board.icon} color={board.color} size="sm" />
        {board.name}
        {board.archived ? (
          <span className="rounded bg-aurora-surface-2 px-1.5 py-0.5 text-[10px] text-aurora-muted">Arquivado</span>
        ) : null}
        {board.tiflux_enabled ? (
          <span className="rounded bg-aurora-accent px-1.5 py-0.5 text-[10px] font-medium text-white">Tiflux</span>
        ) : null}
      </>
    );

    return (
      <>
        <div className="group relative flex items-center gap-2">
          {hubMode ? (
            <button
              type="button"
              onClick={openBoard}
              className={`flex flex-1 items-center gap-2 text-left font-medium text-aurora-fg hover:text-aurora-accent ${
                selected ? "text-aurora-accent" : ""
              }`}
              data-testid="project-tile-select"
            >
              {nameContent}
            </button>
          ) : (
            <Link
              href={`/boards/${board.id}`}
              className="flex flex-1 items-center gap-2 font-medium text-aurora-fg hover:text-aurora-accent"
            >
              {nameContent}
            </Link>
          )}
          {canEdit ? (
            <button
              type="button"
              aria-label="Configuracoes do projeto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSettingsOpen(true);
              }}
              className="rounded-md p-1 text-aurora-muted opacity-0 transition hover:bg-aurora-surface-2 hover:text-aurora-fg group-hover:opacity-100"
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {settingsOpen ? (
          <ProjectSettingsModal
            board={board}
            members={members}
            isOrgAdmin={isOrgAdmin}
            currentUserId={currentUserId}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </>
    );
  }

  const tileClass = `${tileInteractive} block min-h-[7.5rem] p-4 ${selected ? tileSelected : ""}`;

  const tileBody = (
    <>
      <div className="flex items-center gap-3 pr-8">
        <BoardIcon icon={board.icon} color={board.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-aurora-fg">{board.name}</p>
              <div className="mt-0.5 flex min-h-5 flex-wrap gap-1">
            {board.archived ? (
              <span className="rounded bg-aurora-surface-2 px-1.5 py-0.5 text-[10px] text-aurora-muted">Arquivado</span>
            ) : null}
            {board.tiflux_enabled ? (
              <span className="rounded bg-aurora-accent px-1.5 py-0.5 text-[10px] font-medium text-white">Tiflux</span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-aurora-muted">
        {board.description || "\u00A0"}
      </p>
    </>
  );

  return (
    <>
      <div className="relative group" data-testid="project-tile">
        {hubMode ? (
          <button
            type="button"
            onClick={openBoard}
            className={`${tileClass} w-full text-left`}
            style={{ borderLeft: `4px solid ${tint}` }}
            data-testid="project-tile-select"
          >
            {tileBody}
          </button>
        ) : (
          <Link
            href={`/boards/${board.id}`}
            className={tileClass}
            style={{ borderLeft: `4px solid ${tint}` }}
          >
            {tileBody}
          </Link>
        )}
        {canEdit ? (
          <button
            type="button"
            aria-label="Configuracoes do projeto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSettingsOpen(true);
            }}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-aurora-muted opacity-0 transition hover:bg-aurora-surface-2 hover:text-aurora-fg group-hover:opacity-100 focus-visible:opacity-100"
            data-testid="project-settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {settingsOpen ? (
        <ProjectSettingsModal
          board={board}
          members={members}
          isOrgAdmin={isOrgAdmin}
          currentUserId={currentUserId}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}
