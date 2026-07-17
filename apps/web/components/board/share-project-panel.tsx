"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { AccessPresetRow } from "@/lib/access-presets";
import type { BoardMember } from "./board-member";
import { BoardMembersList } from "./board-members-list";
import { InviteEmailsPanel } from "./invite-emails-panel";

export type { BoardMember } from "./board-member";

type Props = {
  boardId: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  canManagePresets?: boolean;
  currentUserId?: string | null;
  showInvite?: boolean;
  accessPresets?: AccessPresetRow[];
};

export function ShareProjectPanel({
  boardId,
  members,
  canManageMembers = false,
  canManagePresets = false,
  currentUserId = null,
  showInvite = true,
  accessPresets,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function copyLink() {
    void navigator.clipboard.writeText(`${appUrl}/boards/${boardId}`).then(() => {
      setCopied(true);
      appToast.success("Link do projeto copiado");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {canManageMembers ? (
        <button type="button" onClick={copyLink} className={`flex w-full items-center justify-center gap-2 ${btnBoardSecondary}`}>
          {copied ? <Check className="h-4 w-4 text-aurora-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Link copiado!" : "Copiar link do projeto"}
        </button>
      ) : null}

      <BoardMembersList
        boardId={boardId}
        members={members}
        canManageMembers={canManageMembers}
        currentUserId={currentUserId}
        presets={accessPresets}
        onError={setError}
      />

      {showInvite ? (
        <InviteEmailsPanel
          boardId={boardId}
          canManageMembers={canManageMembers}
          canManagePresets={canManagePresets}
          presets={accessPresets}
        />
      ) : null}

      {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
    </div>
  );
}
