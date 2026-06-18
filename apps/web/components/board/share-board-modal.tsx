"use client";

import { X } from "lucide-react";
import { ShareProjectPanel, type BoardMember } from "./share-project-panel";

type Props = {
  boardId: string;
  boardName: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  onClose: () => void;
};

export function ShareBoardModal({ boardId, boardName, members, canManageMembers = false, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="hub-panel-enter w-full max-w-md rounded-xl border border-board-border bg-board-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-aurora-fg">Compartilhar {boardName}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-aurora-muted hover:text-aurora-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ShareProjectPanel boardId={boardId} members={members} canManageMembers={canManageMembers} />
      </div>
    </div>
  );
}
