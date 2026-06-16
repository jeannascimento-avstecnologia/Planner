"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { inviteToBoard } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimary, btnBoardSecondary } from "@/lib/ui-classes";
import type { ProfileRow } from "./types";

export type BoardMember = { user_id: string; role: string; profile?: ProfileRow };

type Props = {
  boardId: string;
  members: BoardMember[];
};

export function ShareProjectPanel({ boardId, members }: Props) {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function copyLink() {
    void navigator.clipboard.writeText(`${appUrl}/boards/${boardId}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={copyLink} className={`flex w-full items-center justify-center gap-2 ${btnBoardSecondary}`}>
        {copied ? <Check className="h-4 w-4 text-aurora-success" /> : <Copy className="h-4 w-4" />}
        {copied ? "Link copiado!" : "Copiar link do projeto"}
      </button>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-aurora-muted">Membros</p>
        <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
          {members.length === 0 ? (
            <li className="text-aurora-muted">Apenas membros da organizacao por enquanto.</li>
          ) : (
            members.map((m) => (
              <li key={m.user_id} className="flex justify-between text-aurora-fg">
                <span>{m.profile?.full_name ?? m.user_id.slice(0, 8)}</span>
                <span className="text-aurora-muted">{m.role === "admin" ? "Editar" : "Visualizar"}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <form
        action={(fd) => {
          setError(null);
          fd.set("boardId", boardId);
          startTransition(async () => {
            const res = await inviteToBoard(fd);
            if (!res.ok) setError(res.error);
            else if (res.inviteUrl) setInviteUrl(res.inviteUrl);
          });
        }}
        className="space-y-2"
      >
        <input name="email" type="email" placeholder="email@empresa.com" required className={inputBoardClassSm} />
        <select name="role" defaultValue="viewer" className={inputBoardClassSm}>
          <option value="viewer">Visualizar</option>
          <option value="admin">Editar</option>
        </select>
        {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
        {inviteUrl ? (
          <p className="break-all rounded bg-board-accent-muted p-2 text-[11px] text-board-accent">{inviteUrl}</p>
        ) : null}
        <button type="submit" disabled={pending} className={`w-full ${btnBoardPrimary}`}>
          Convidar por email
        </button>
      </form>
    </div>
  );
}
