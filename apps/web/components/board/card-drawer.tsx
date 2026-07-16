"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { CardPriority } from "@nextgen/contracts";
import { getCardDeleteImpact, updateCard } from "@/app/(app)/boards/[boardId]/card-actions";
import { inputBoardClassSm, btnBoardPrimarySm, btnBoardSecondary, btnDanger } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AuroraDrawer } from "@/components/ui/aurora-drawer";
import { stageCardStyle } from "@/lib/color-utils";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TagPickerPopover } from "./tag-picker-popover";
import { StageSelector } from "./stage-selector";
import { StageBadge } from "./badges";
import { TifluxTicketBadges } from "./tiflux-ticket-badges";
import { CardPlanWorkSection } from "@/components/plan/card-plan-work-section";
import { CardDrawerReadOnly } from "./card-drawer-readonly";
import { CreateCardForm } from "./create-card-form";
import { ChecklistEditor } from "./checklist-editor";
import { countDescendants, wouldExceedMaxDepth } from "@/lib/card-tree";
import { resolveCardStage, isCardOverdue, type BoardCard, type ColumnRow, type ProfileRow, type StageRow, type TagRow } from "./types";

type Props = {
  card: BoardCard;
  boardId: string;
  orgId: string;
  columns: ColumnRow[];
  stages: StageRow[];
  tags: TagRow[];
  members: ProfileRow[];
  allCards?: BoardCard[];
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
  allCards = [],
  isOrgAdmin = false,
  readOnly = false,
  tifluxEnabled = false,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{ subtasks: number; dependencies: number } | null>(null);

  useEffect(() => {
    if (readOnly || !deleteOpen) {
      setDeleteImpact(null);
      return;
    }
    let cancelled = false;
    void getCardDeleteImpact(card.id, boardId).then((impact) => {
      if (!cancelled) setDeleteImpact(impact);
    });
    return () => {
      cancelled = true;
    };
  }, [readOnly, deleteOpen, card.id, boardId]);

  const children = useMemo(
    () =>
      allCards
        .filter((c) => c.parent_id === card.id)
        .sort((a, b) => a.position.localeCompare(b.position)),
    [allCards, card.id],
  );
  const branchDescendants = useMemo(
    () => countDescendants(allCards, card.id),
    [allCards, card.id],
  );
  const canAddChild = !wouldExceedMaxDepth(allCards, card.id);

  if (readOnly) {
    return (
      <CardDrawerReadOnly
        card={card}
        boardId={boardId}
        columns={columns}
        stages={stages}
        tags={tags}
        members={members}
        allCards={allCards}
        tifluxEnabled={tifluxEnabled}
        onClose={onClose}
      />
    );
  }

  const dueValue = card.due_date ? card.due_date.slice(0, 10) : "";
  const startValue = card.start_date ? card.start_date.slice(0, 10) : "";
  const targetValue = card.target_date ? card.target_date.slice(0, 10) : "";
  const stagesById = new Map(stages.map((s) => [s.id, s]));
  const stage = resolveCardStage(card, columns, stagesById);
  const overdue = isCardOverdue(card, stagesById);
  const headerStyle = stage ? stageCardStyle(stage.color) : undefined;

  function confirmDelete() {
    setDeleteError(null);
    const key = boardCardsQueryKey(boardId);
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    // Optimistic: some da arvore/kanban imediatamente
    queryClient.setQueryData<BoardCard[]>(key, (curr) =>
      (curr ?? []).filter((c) => c.id !== card.id),
    );
    startTransition(async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
        if (!res.ok) {
          if (previous) queryClient.setQueryData(key, previous);
          const err = body.error ?? "Nao foi possivel excluir o card.";
          setDeleteError(err);
          appToast.error(err);
          return;
        }
        setDeleteOpen(false);
        onClose();
        appToast.success("Card excluido");
        void queryClient.invalidateQueries({ queryKey: key });
      } catch {
        if (previous) queryClient.setQueryData(key, previous);
        const msg = "Nao foi possivel excluir o card.";
        setDeleteError(msg);
        appToast.error(msg);
      }
    });
  }

  const cardFormId = `card-edit-${card.id}`;

  function deleteConfirmMessage(): string {
    const base = `Tem certeza que deseja excluir "${card.title}"? Esta acao nao pode ser desfeita.`;
    if (!deleteImpact) return base;
    const parts: string[] = [];
    if (deleteImpact.subtasks > 0) {
      parts.push(
        deleteImpact.subtasks === 1
          ? "1 subtarefa vinculada"
          : `${deleteImpact.subtasks} subtarefas vinculadas`,
      );
    }
    if (deleteImpact.dependencies > 0) {
      parts.push(
        deleteImpact.dependencies === 1
          ? "1 dependencia vinculada"
          : `${deleteImpact.dependencies} dependencias vinculadas`,
      );
    }
    if (parts.length === 0) return base;
    return `${base} Isso remove permanentemente ${parts.join(" e ")}.`;
  }

  return (
    <AuroraDrawer onClose={onClose} showHeader={false} testId="card-drawer">
      <div className="flex min-h-0 flex-1 flex-col">
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
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Entrega estimada</label>
              <DatePickerPopover
                name="targetDate"
                defaultValue={targetValue}
                placeholder="Planejamento (opcional)"
                clearLabel="Limpar entrega estimada"
                variant="board"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Prazo final</label>
              <DatePickerPopover
                name="dueDate"
                defaultValue={dueValue}
                clearLabel="Limpar prazo"
                variant="board"
                overdue={overdue}
              />
            </div>
            <div />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Horas estimadas</label>
            <input
              name="estimatedHours"
              type="number"
              min={0}
              max={999.99}
              step={0.5}
              defaultValue={card.estimated_hours ?? ""}
              placeholder="ex: 8"
              className={inputBoardClassSm}
              data-testid="card-estimated-hours"
            />
          </div>

          {card.assignee_id && (
            <CardPlanWorkSection cardId={card.id} estimatedHours={card.estimated_hours} />
          )}

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
            <select
              key={card.assignee_id ?? "none"}
              name="assigneeId"
              defaultValue={card.assignee_id ?? ""}
              className={inputBoardClassSm}
            >
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
          <div data-testid="drawer-subtasks">
            <p className="mb-1 text-xs font-medium text-aurora-muted">
              Subtarefas (cards filhos)
            </p>
            <p className="mb-2 text-[11px] leading-snug text-aurora-muted">
              Cards vinculados via hierarquia — distintos dos to-dos (checklist) abaixo.
            </p>
            <div
              className="mb-2 flex flex-wrap gap-2 text-[11px] text-aurora-muted"
              data-testid="drawer-tree-counts"
            >
              <span data-testid="drawer-direct-children-count">
                Filhos diretos: {children.length}
              </span>
              <span data-testid="drawer-branch-descendants-count">
                No ramo: {branchDescendants}
              </span>
            </div>
            {children.length === 0 ? (
              <p className="mb-2 text-xs text-aurora-muted">Nenhuma subtarefa.</p>
            ) : (
              <ul className="mb-2 space-y-1">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="rounded-md border border-board-border px-2 py-1.5 text-sm"
                    data-testid={`drawer-subtask-${child.id}`}
                  >
                    {child.title}
                    {child.completed_at ? (
                      <span className="ml-2 text-xs text-aurora-muted">concluida</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {canAddChild ? (
              <CreateCardForm
                boardId={boardId}
                columnId={card.column_id}
                parentId={card.id}
                compact
                onCardCreated={() => appToast.success("Subtarefa criada")}
              />
            ) : (
              <p className="text-xs text-aurora-muted">Profundidade maxima atingida.</p>
            )}
          </div>

          <div data-testid="drawer-checklist">
            <p className="mb-1 text-xs font-medium text-aurora-muted">To-dos (checklist)</p>
            <p className="mb-2 text-[11px] leading-snug text-aurora-muted">
              Itens de checklist neste card — nao criam card filho na arvore.
            </p>
            <ChecklistEditor cardId={card.id} boardId={boardId} items={card.checklistItems} canEdit />
          </div>

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

        <div className="shrink-0 flex flex-col gap-2 border-t border-board-border px-4 py-3">
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
        message={deleteConfirmMessage()}
        confirmLabel="Excluir"
        pending={pending}
        variant="board"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
      </div>
    </AuroraDrawer>
  );
}
