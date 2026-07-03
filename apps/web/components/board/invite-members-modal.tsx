"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { MODAL_BODY_CLASS } from "@/components/ui/aurora-surface";
import { InviteEmailsPanel } from "./invite-emails-panel";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  boardId: string;
  boardName: string;
  canManageMembers?: boolean;
  onClose: () => void;
};

export function InviteMembersModal({
  boardId,
  boardName,
  canManageMembers = false,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function copyProjectLink() {
    void navigator.clipboard.writeText(`${appUrl}/boards/${boardId}`).then(() => {
      setCopied(true);
      appToast.success("Link do projeto copiado");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AuroraModal
      onClose={onClose}
      title="Convidar um integrante"
      subtitle={boardName}
      size="lg"
      testId="invite-members-modal"
      bodyClassName={`flex flex-col gap-5 ${MODAL_BODY_CLASS}`}
    >
      <InviteEmailsPanel boardId={boardId} canManageMembers={canManageMembers} />

      {canManageMembers ? (
        <button
          type="button"
          onClick={copyProjectLink}
          className={`flex w-full items-center justify-center gap-2 ${btnBoardSecondary}`}
        >
          {copied ? <Check className="h-4 w-4 text-aurora-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Link copiado!" : "Copiar link do projeto (membros da org)"}
        </button>
      ) : null}
    </AuroraModal>
  );
}
