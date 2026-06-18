"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createTifluxTicket } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimary } from "@/lib/ui-classes";
import { TifluxCombobox, type TifluxOption } from "./tiflux-combobox";
import type { BoardCard } from "./types";

type Props = {
  boardId: string;
  card: BoardCard;
  onClose: () => void;
};

export function TifluxTicketModal({ boardId, card, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [description, setDescription] = useState(card.description ?? card.title);
  const [client, setClient] = useState<TifluxOption | null>(null);
  const [desk, setDesk] = useState<TifluxOption | null>(null);
  const [priority, setPriority] = useState<TifluxOption | null>(null);
  const [serviceItem, setServiceItem] = useState<TifluxOption | null>(null);
  const [requestor, setRequestor] = useState<TifluxOption | null>(null);
  const [followers, setFollowers] = useState<TifluxOption[]>([]);
  const [parentTicket, setParentTicket] = useState<TifluxOption | null>(null);

  const deskId = desk ? Number(desk.value) : undefined;
  const clientId = client ? Number(client.value) : undefined;

  function selectClient(option: TifluxOption | null) {
    setClient(option);
    setRequestor(null);
  }

  function selectDesk(option: TifluxOption | null) {
    setDesk(option);
    setPriority(null);
    setServiceItem(null);
    setParentTicket(null);
  }

  function submit() {
    setError(null);
    setSuccess(null);

    if (!client) return setError("Selecione a Empresa.");
    if (!desk) return setError("Selecione a Mesa.");
    if (!priority) return setError("Selecione a Prioridade.");
    if (!requestor) return setError("Selecione o Solicitante.");
    if (!requestor.email) return setError("O solicitante precisa ter e-mail no Tiflux.");
    if (!description.trim()) return setError("Preencha a Descricao.");

    const fd = new FormData();
    fd.set("cardId", card.id);
    fd.set("boardId", boardId);
    fd.set("title", card.title);
    fd.set("description", description.trim());
    fd.set("clientId", client.value);
    fd.set("deskId", desk.value);
    if (priority) fd.set("priorityId", priority.value);
    if (serviceItem) fd.set("servicesCatalogsItemId", serviceItem.value);
    if (requestor) {
      fd.set("requestorId", requestor.value);
      if (requestor.email) fd.set("requestorEmail", requestor.email);
      fd.set("requestorName", requestor.label);
    }
    const followerEmails = followers.map((f) => f.email).filter(Boolean) as string[];
    if (followerEmails.length) fd.set("followers", followerEmails.join(","));
    if (parentTicket) fd.set("parentTicketNumber", parentTicket.value);

    startTransition(async () => {
      const result = await createTifluxTicket(fd);
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
      data-testid="tiflux-ticket-modal"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-board-border bg-board-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tiflux-modal-title"
      >
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="tiflux-modal-title" className="text-lg font-semibold text-aurora-fg">
              Chamado Tiflux
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
              <p className="text-sm text-aurora-muted">Chamado criado com sucesso</p>
              <p className="mt-1 text-2xl font-bold text-aurora-fg">#{success}</p>
              <p className="mt-1 text-xs text-aurora-muted">Numero atrelado a este card.</p>
            </div>
            <button type="button" onClick={onClose} className={`w-full ${btnBoardPrimary}`}>
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Descricao</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className={inputBoardClassSm}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Empresa</label>
              <TifluxCombobox boardId={boardId} kind="client" value={client} onChange={selectClient} placeholder="Pesquisar empresa..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Mesa</label>
              <TifluxCombobox boardId={boardId} kind="desk" value={desk} onChange={selectDesk} placeholder="Pesquisar mesa..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Prioridade</label>
              <TifluxCombobox
                boardId={boardId}
                kind="priority"
                deskId={deskId}
                value={priority}
                onChange={setPriority}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Selecionar prioridade..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Grupo de recursos</label>
              <TifluxCombobox
                boardId={boardId}
                kind="services_catalog_item"
                deskId={deskId}
                value={serviceItem}
                onChange={setServiceItem}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Pesquisar grupo..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Solicitante</label>
              <TifluxCombobox
                boardId={boardId}
                kind="requestor"
                clientId={clientId}
                value={requestor}
                onChange={setRequestor}
                disabled={!clientId}
                disabledHint="Selecione a empresa primeiro"
                placeholder="Pesquisar solicitante..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Seguidores</label>
              <TifluxCombobox boardId={boardId} kind="user" multi value={followers} onChange={setFollowers} placeholder="Adicionar seguidores..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurora-muted">Ticket Pai</label>
              <TifluxCombobox
                boardId={boardId}
                kind="parent_ticket"
                deskId={deskId}
                value={parentTicket}
                onChange={setParentTicket}
                disabled={!deskId}
                disabledHint="Selecione a mesa primeiro"
                placeholder="Pesquisar ticket pai..."
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
                {pending ? "Criando..." : "Criar ticket"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
