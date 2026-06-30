"use client";

import type { BoardMember } from "./board-member";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { ShareProjectPanel } from "./share-project-panel";

type Props = {
  boardId: string;
  boardName: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onClose: () => void;
};

export function BoardAccessModal({
  boardId,
  boardName,
  members,
  canManageMembers = false,
  currentUserId = null,
  onClose,
}: Props) {
  return (
    <AuroraModal
      onClose={onClose}
      title="Gerenciar acesso"
      subtitle={boardName}
      size="lg"
      testId="board-access-modal"
    >
      <ShareProjectPanel
        boardId={boardId}
        members={members}
        canManageMembers={canManageMembers}
        currentUserId={currentUserId}
        showInvite={false}
      />
    </AuroraModal>
  );
}
