"use client";

import { useTransition } from "react";
import type { CardPriority } from "@nextgen/contracts";
import { updateCard } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimarySm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TagPickerPopover } from "./tag-picker-popover";
import type { BoardCard, ProfileRow, TagRow } from "./types";

type Props = {
  card: BoardCard;
  boardId: string;
  orgId: string;
  tags: TagRow[];
  members: ProfileRow[];
  onClose: () => void;
};

export function CardDrawer({ card, boardId, orgId, tags, members, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const dueValue = card.due_date ? card.due_date.slice(0, 10) : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-board-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-board-border px-4 py-3">
          <h2 className="text-sm font-semibold text-aurora-fg">Editar card</h2>
          <button type="button" onClick={onClose} className="text-aurora-muted hover:text-aurora-fg">
            Fechar
          </button>
        </header>

        <form
          action={(fd) => startTransition(() => updateCard(fd))}
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="boardId" value={boardId} />

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Titulo</label>
            <input name="title" defaultValue={card.title} required className={inputBoardClassSm} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Descricao</label>
            <textarea
              name="description"
              defaultValue={card.description ?? ""}
              rows={4}
              className={inputBoardClassSm}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Prioridade</label>
              <select name="priority" defaultValue={card.priority} className={inputBoardClassSm}>
                {(["low", "medium", "high", "urgent"] as CardPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Prazo</label>
              <DatePickerPopover name="dueDate" defaultValue={dueValue} variant="board" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Responsavel</label>
            <select name="assigneeId" defaultValue={card.assignee_id ?? ""} className={inputBoardClassSm}>
              <option value="">Sem responsavel</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-aurora-muted">Marcadores</p>
            <TagPickerPopover
              cardId={card.id}
              boardId={boardId}
              orgId={orgId}
              tagIds={card.tagIds}
              tags={tags}
            />
          </div>

          <button type="submit" disabled={pending} className={btnBoardPrimarySm}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </aside>
    </div>
  );
}
