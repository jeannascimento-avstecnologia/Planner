"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { linkTifluxTicket } from "@/app/(app)/boards/[boardId]/actions";
import { btnBoardPrimary } from "@/lib/ui-classes";
import { TifluxCombobox, type TifluxOption } from "./tiflux-combobox";
import type { BoardCard } from "./types";

type Props = {
  boardId: string;
  card: BoardCard;
  onClose: () => void;
};

export function TifluxLinkTicketModal({ boardId, card, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [client, setClient] = useState<TifluxOption | null>(null);
  const [desk, setDesk] = useState<TifluxOption | null>(null);
  const [ticket, setTicket] = useState<TifluxOption | null>(null);
  const [parentTicket, setParentTicket] = useState<TifluxOption | null>(null);
  const [childTicket, setChildTicket] = useState<TifluxOption | null>(null);

  const deskId = desk ? Number(desk.value) : undefined;

  function selectDesk(option: TifluxOption | null) {
    setDesk(option);
    setTicket(null);
    setParentTicket(null);
    setChildTicket(null);
  }

  function submit() {
    setError(null);
    if (!client) return setError("Selecione a Empresa.");
    if (!desk) return setError("Selecione a Mesa.");
    if (!ticket) return setError("Selecione o Ticket.");

    const fd = new FormData();
    fd.set("cardId", card.id);
    fd.set("boardId", boardId);
    fd.set("clientId", client.value);
    fd.set("deskId", desk.value);
    fd.set("ticketNumber", ticket.value);
    if (parentTicket) fd.set("parentTicketNumber", parentTicket.value);
    if (childTicket) fd.set("childTicketNumber", childTicket.value);

    startTransition(async () => {
      const result = await linkTifluxTicket(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(result.ticketNumber);
      router.refresh();
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="tiflux-link-modal"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-board-border bg-board-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tiflux-link-title"
      >
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="tiflux-link-title" className="text-lg font-semibold text-aurora-fg">
              Associar a um ticket
            </h2>
            <p className="mt-1 text-sm text-aurora-muted">{card.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-aurora-muted hover:text-aurora-fg">
            <X className="h-5 w-5" />
          </button>
        </header>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-aurora-success/40 bg-aurora-success/10 p-4 text-center">
              <p className="text-sm text-aurora-muted">Ticket vinculado</p>
              <p className="mt-1 text-2xl font-bold text-aurora-fg">#{success}</p>
            </div>
            <button type="button" onClick={onClose} className={`w-full ${btnBoardPrimary}`}>
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-aurora-muted">Empresa</label>
              <TifluxCombobox boardId={boardId} kind="client" value={client} onChange={setClient} placeholder="Pesquisar empresa..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-aurora-muted">Mesa</label>
              <TifluxCombobox boardId={boardId} kind="desk" value={desk} onChange={selectDesk} placeholder="Pesquisar mesa..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-aurora-muted">Ticket</label>
              <TifluxCombobox
                boardId={boardId}
                kind="parent_ticket"
                deskId={deskId}
                value={ticket}
                onChange={setTicket}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Pesquisar ticket..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-aurora-muted">Ticket pai (opcional)</label>
              <TifluxCombobox
                boardId={boardId}
                kind="parent_ticket"
                deskId={deskId}
                value={parentTicket}
                onChange={setParentTicket}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Ticket pai..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-aurora-muted">Ticket filho (opcional)</label>
              <TifluxCombobox
                boardId={boardId}
                kind="parent_ticket"
                deskId={deskId}
                value={childTicket}
                onChange={setChildTicket}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Ticket filho..."
              />
            </div>

            {error ? <p className="text-sm text-aurora-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-md border border-board-border px-3 py-1.5 text-sm text-aurora-fg hover:bg-board-accent-muted/40"
              >
                Cancelar
              </button>
              <button type="button" onClick={submit} disabled={pending} className={btnBoardPrimary}>
                {pending ? "Salvando..." : "Vincular"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
