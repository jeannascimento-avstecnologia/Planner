"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CardPriority } from "@nextgen/contracts";
import { deleteCard, updateCard } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimarySm, btnBoardSecondary, btnDanger } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AuroraDrawer } from "@/components/ui/aurora-drawer";
import { stageCardStyle } from "@/lib/color-utils";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TagPickerPopover } from "./tag-picker-popover";
import { StageSelector } from "./stage-selector";
import { StageBadge } from "./badges";
import { TifluxTicketBadges } from "./tiflux-ticket-badges";
import { CardDrawerReadOnly } from "./card-drawer-readonly";
import { resolveCardStage, isCardOverdue, type BoardCard, type ColumnRow, type ProfileRow, type StageRow, type TagRow } from "./types";

type Props = {
  card: BoardCard;
  boardId: string;
  orgId: string;
  columns: ColumnRow[];
  stages: StageRow[];
  tags: TagRow[];
  members: ProfileRow[];
  isOrgAdmin?: boolean;
  readOnly?: boolean;
  tifluxEnabled?: boolean;
  onOpenTifluxCreate?: (cardId: string) => void;
  onOpenTifluxLink?: (cardId: string) => void;
  onClose: () => void;
};

export function CardDrawer({
  card,
  boardId,
  orgId,
  columns,
  stages,
  tags,
  members,
  isOrgAdmin = false,
  readOnly = false,
  tifluxEnabled = false,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  onClose,
}: Props) {
  if (readOnly) {
    return (
      <CardDrawerReadOnly
        card={card}
        columns={columns}
        stages={stages}
        tags={tags}
        members={members}
        tifluxEnabled={tifluxEnabled}
        onClose={onClose}
      />
    );
  }
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dueValue = card.due_date ? card.due_date.slice(0, 10) : "";
  const startValue = card.start_date ? card.start_date.slice(0, 10) : "";
  const stagesById = new Map(stages.map((s) => [s.id, s]));
  const stage = resolveCardStage(card, columns, stagesById);
  const overdue = isCardOverdue(card, stagesById);
  const headerStyle = stage ? stageCardStyle(stage.color) : undefined;

  function confirmDelete() {
    setDeleteError(null);
    const fd = new FormData();
    fd.set("cardId", card.id);
    fd.set("boardId", boardId);
    startTransition(async () => {
      const result = await deleteCard(fd);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      onClose();
      router.refresh();
    });
  }

  const cardFormId = `card-edit-${card.id}`;

  return (
    <AuroraDrawer onClose={onClose} showHeader={false} testId="card-drawer">
      <header
          className="flex items-center justify-between border-b border-board-border px-4 py-3"
          style={headerStyle ? { backgroundColor: headerStyle.backgroundColor, color: headerStyle.color } : undefined}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Editar card</h2>
            {stage ? <StageBadge name={stage.name} color={stage.color} /> : null}
          </div>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            Fechar
          </button>
        </header>

        <div className="border-b border-board-border px-4 py-3">
          <StageSelector
            boardId={boardId}
            cardId={card.id}
            currentStageId={card.stage_id}
            stages={stages}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
        <form
          id={cardFormId}
          action={(fd) =>
            startTransition(async () => {
              await updateCard(fd);
              appToast.success("Card salvo");
              router.refresh();
            })
          }
          className="flex flex-col gap-3 p-4 pb-2"
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
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Inicio</label>
              <DatePickerPopover
                name="startDate"
                defaultValue={startValue}
                placeholder="Inicio (opcional)"
                clearLabel="Limpar inicio"
                variant="board"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Prazo</label>
              <DatePickerPopover
                name="dueDate"
                defaultValue={dueValue}
                clearLabel="Limpar prazo"
                variant="board"
                overdue={overdue}
              />
            </div>
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
            <div />
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
              isOrgAdmin={isOrgAdmin}
            />
          </div>
        </form>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {tifluxEnabled ? (
            <div>
              <p className="mb-1 text-xs font-medium text-aurora-muted">Tiflux</p>
              {card.tiflux_ticket_number ? (
                <div className="flex flex-col items-start gap-2">
                  <TifluxTicketBadges ticketNumber={card.tiflux_ticket_number} />
                  <a
                    href={`https://suporte.avstecnologia.cloud/v/tickets/${card.tiflux_ticket_id ?? card.tiflux_ticket_number}/appointments`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 ${btnBoardSecondary}`}
                    data-testid="tiflux-show-appointments"
                  >
                    Mostrar apontamentos
                  </a>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="tiflux-drawer-create"
                    onClick={() => onOpenTifluxCreate?.(card.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-aurora-accent px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Criar ticket
                  </button>
                  <button
                    type="button"
                    data-testid="tiflux-drawer-link"
                    onClick={() => onOpenTifluxLink?.(card.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-aurora-accent px-3 py-1.5 text-sm font-medium text-aurora-accent transition hover:bg-aurora-accent-muted/40"
                  >
                    Associar a um ticket
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-board-border px-4 py-3">
          <button
            type="submit"
            form={cardFormId}
            data-testid="card-save"
            disabled={pending}
            className={btnBoardPrimarySm}
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            data-testid="delete-card"
            onClick={() => setDeleteOpen(true)}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-1.5 ${btnDanger}`}
          >
            <Trash2 className="h-4 w-4" />
            Excluir card
          </button>
          {deleteError ? <p className="text-xs text-aurora-danger">{deleteError}</p> : null}
        </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir card"
        message={`Tem certeza que deseja excluir "${card.title}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        pending={pending}
        variant="board"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AuroraDrawer>
  );
}
