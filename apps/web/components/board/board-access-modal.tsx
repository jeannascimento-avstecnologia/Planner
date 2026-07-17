"use client";

import type { BoardMember } from "./board-member";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { ShareProjectPanel } from "./share-project-panel";
import type { AccessPresetRow } from "@/lib/access-presets";

type Props = {
  boardId: string;
  boardName: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  currentUserId?: string | null;
  accessPresets?: AccessPresetRow[];
  onClose: () => void;
};

export function BoardAccessModal({
  boardId,
  boardName,
  members,
  canManageMembers = false,
  currentUserId = null,
  accessPresets,
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
        accessPresets={accessPresets}
        showInvite={false}
      />
    </AuroraModal>
  );
}
