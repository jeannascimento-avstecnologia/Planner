"use client";

import { useRef, useTransition } from "react";
import { ExternalLink, Paperclip, Trash2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCardAttachmentAction,
  deleteCardAttachmentAction,
} from "@/app/(app)/boards/[boardId]/card-actions";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  applyAttachmentAddToList,
  applyAttachmentRemoveToList,
} from "@/lib/query/board-cards-cache";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "@/lib/cloudinary-client-upload";
import { appToast } from "@/lib/toast";
import { useAuthUserId } from "@/hooks/use-auth-user-id";
import type { BoardCard, CardAttachment } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  orgId: string;
  attachments: CardAttachment[];
  currentUserId: string | null;
  canManage: boolean;
};

function displayLabel(attachment: CardAttachment): string {
  return attachment.label?.trim() || attachment.url;
}

export function CardAttachments({
  cardId,
  boardId,
  orgId,
  attachments,
  currentUserId: propUserId,
  canManage,
}: Props) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthUserId(propUserId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const key = boardCardsQueryKey(boardId);
  const cloudinaryReady = isCloudinaryConfigured();

  function persistAttachment(url: string, label: string) {
    const tempId = `tmp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(
        key,
        applyAttachmentAddToList(previous, cardId, {
          id: tempId,
          kind: "url",
          url,
          label: label || null,
          createdBy: currentUserId!,
          createdAt: now,
        }),
      );
    }
    startTransition(async () => {
      const result = await createCardAttachmentAction({
        cardId,
        url,
        label: label || undefined,
      });
      if ("error" in result) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
      appToast.success("Arquivo anexado");
    });
  }

  async function handleFileSelect(file: File) {
    if (!canManage || !currentUserId) return;
    if (!cloudinaryReady) {
      appToast.error("Upload nao configurado (Cloudinary).");
      return;
    }

    try {
      const secureUrl = await uploadFileToCloudinary(file, {
        orgId,
        purpose: "card",
        cardId,
      });
      persistAttachment(secureUrl, file.name);
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAttachment(attachmentId: string) {
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyAttachmentRemoveToList(previous, cardId, attachmentId));
    }
    startTransition(async () => {
      const result = await deleteCardAttachmentAction({ attachmentId });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  return (
    <div data-testid={`card-attachments-${cardId}`} className="nodrag nopan space-y-2">
      {attachments.length === 0 ? (
        <p className="text-xs text-aurora-muted">Nenhum anexo.</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="group flex items-center gap-2 rounded-md border border-board-border px-2 py-1.5"
              data-testid={`card-attachment-${attachment.id}`}
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-aurora-muted" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-aurora-accent hover:underline"
              >
                {displayLabel(attachment)}
              </a>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir anexo"
                className="shrink-0 text-aurora-muted hover:text-aurora-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {canManage ? (
                <button
                  type="button"
                  aria-label="Remover anexo"
                  className="shrink-0 rounded p-0.5 text-aurora-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                  disabled={pending}
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div data-testid={`card-attachment-add-${cardId}`}>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            disabled={pending || !cloudinaryReady}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelect(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending || !cloudinaryReady}
            aria-label="Anexar arquivo"
            className="inline-flex items-center gap-1.5 rounded-md border border-board-border px-2.5 py-1.5 text-xs text-aurora-fg hover:bg-board-accent-muted/40 disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" />
            {pending ? "Salvando..." : "Anexar arquivo"}
          </button>
          {!cloudinaryReady ? (
            <p className="mt-1 text-[11px] text-aurora-muted">Cloudinary nao configurado.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
