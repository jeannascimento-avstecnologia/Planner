"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  assignDueDate,
  createDeadlineCard,
  searchOrgCards,
  type BoardOption,
  type ColumnOption,
  type OrgCardHit,
} from "@/app/(app)/calendar/actions";
import { btnPrimary, btnSecondary, inputClassSm } from "@/lib/ui-classes";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { MODAL_BODY_SCROLL_MAX } from "@/components/ui/aurora-surface";
import { appToast } from "@/lib/toast";
import { formatDateLabel, toDateInputValue } from "@/lib/calendar-grid";
import type { CalendarEvent } from "@/app/(app)/calendar/calendar-client";

type Props = {
  date: Date;
  orgId: string;
  boards: BoardOption[];
  columns: ColumnOption[];
  dayEvents: CalendarEvent[];
  onClose: () => void;
};

export function DeadlineAgendaModal({ date, orgId, boards, columns, dayEvents, onClose }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"link" | "create">(dayEvents.length > 0 ? "link" : "create");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrgCardHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dateIso = toDateInputValue(date.getFullYear(), date.getMonth(), date.getDate());
  const dateLabel = formatDateLabel(dateIso);

  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const boardColumns = columns.filter((c) => c.board_id === boardId);
  const [columnId, setColumnId] = useState(boardColumns[0]?.id ?? "");

  function onBoardChange(id: string) {
    setBoardId(id);
    const cols = columns.filter((c) => c.board_id === id);
    setColumnId(cols[0]?.id ?? "");
  }

  function runSearch(q: string) {
    setQuery(q);
    startTransition(async () => {
      const results = await searchOrgCards(orgId, q);
      setHits(results);
    });
  }

  function linkCard(hit: OrgCardHit) {
    setError(null);
    startTransition(async () => {
      const res = await assignDueDate(hit.id, hit.board_id, dateIso);
      if (!res.ok) setError(res.error ?? "Erro");
      else {
        appToast.success("Prazo vinculado ao card");
        router.refresh();
        onClose();
      }
    });
  }

  function createNew(formData: FormData) {
    setError(null);
    const title = String(formData.get("title") ?? "");
    const b = String(formData.get("boardId") ?? boardId);
    const col = String(formData.get("columnId") ?? columnId);
    startTransition(async () => {
      const res = await createDeadlineCard(b, col, title, dateIso);
      if (!res.ok) setError(res.error ?? "Erro");
      else {
        appToast.success("Prazo criado");
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <AuroraModal
      onClose={onClose}
      title={`Agenda — ${dateLabel}`}
      subtitle="Vincular card existente ou criar novo prazo."
      size="md"
      testId="deadline-agenda-modal"
      bodyClassName={`flex flex-col px-6 py-4 ${MODAL_BODY_SCROLL_MAX}`}
      footer={
        <button type="button" onClick={onClose} className={`w-full ${btnSecondary}`}>
          Fechar
        </button>
      }
    >
        {dayEvents.length > 0 ? (
          <ul className="mb-4 space-y-1 rounded-lg border border-aurora-border p-2 text-sm">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/boards/${e.board_id}`} className="text-aurora-accent hover:underline">
                  {e.title}
                  {e.board_name ? <span className="text-aurora-muted"> · {e.board_name}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mb-4 flex gap-2 border-b border-aurora-border">
          <button
            type="button"
            onClick={() => setTab("link")}
            className={`px-3 py-2 text-sm ${tab === "link" ? "border-b-2 border-aurora-accent font-medium" : "text-aurora-muted"}`}
          >
            Vincular existente
          </button>
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`px-3 py-2 text-sm ${tab === "create" ? "border-b-2 border-aurora-accent font-medium" : "text-aurora-muted"}`}
          >
            Criar prazo
          </button>
        </div>

        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}

        {tab === "link" ? (
          <div className="space-y-3">
            <input
              type="search"
              placeholder="Buscar card..."
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              className={inputClassSm}
            />
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {pending && hits.length === 0 ? (
                <li className="text-sm text-aurora-muted">Buscando...</li>
              ) : hits.length === 0 ? (
                <li className="text-sm text-aurora-muted">Digite para buscar cards.</li>
              ) : (
                hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => linkCard(h)}
                      className="w-full rounded px-2 py-2 text-left text-sm hover:bg-aurora-accent-muted"
                    >
                      <span className="font-medium text-aurora-fg">{h.title}</span>
                      <span className="text-aurora-muted"> · {h.board_name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <form action={createNew} className="space-y-3">
            <input name="title" placeholder="Titulo do prazo" required className={inputClassSm} />
            <select
              name="boardId"
              value={boardId}
              onChange={(e) => onBoardChange(e.target.value)}
              className={inputClassSm}
              required
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              name="columnId"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className={inputClassSm}
              required
            >
              {boardColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Criando..." : "Criar prazo"}
            </button>
          </form>
        )}

    </AuroraModal>
  );
}
