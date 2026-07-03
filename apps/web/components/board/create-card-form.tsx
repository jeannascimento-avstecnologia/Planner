"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createCard } from "@/app/(app)/boards/[boardId]/actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";

type Props = {
  boardId: string;
  columnId: string;
  onCardCreated?: (cardId: string, title: string) => void;
};

export function CreateCardForm({ boardId, columnId, onCardCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [optimisticTitle, addOptimisticTitle] = useOptimistic(title, (_current, next: string) => next);
  const submittingRef = useRef(false);
  const submitSeqRef = useRef(0);

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "pre-fix",
        hypothesisId: "H6",
        location: "create-card-form.tsx:mount",
        message: "CreateCardForm mounted",
        data: { columnId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    return () => {
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "pre-fix",
          hypothesisId: "H6",
          location: "create-card-form.tsx:unmount",
          message: "CreateCardForm unmounted",
          data: { columnId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
  }, [columnId]);
  // #endregion

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const seq = ++submitSeqRef.current;
    const blockedBeforeRef = submittingRef.current || pending || isSubmitting;
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "pre-fix",
        hypothesisId: "H1-H2",
        location: "create-card-form.tsx:handleSubmit:entry",
        message: "create card submit entry",
        data: { seq, blockedBeforeRef, pending, submittingRef: submittingRef.current, isSubmitting, columnId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (blockedBeforeRef) return;

    setError(null);
    const fd = new FormData(e.currentTarget);
    const submittedTitle = String(fd.get("title") ?? "").trim();
    if (!submittedTitle) return;

    const lockKey = `card:${boardId}:${columnId}`;
    if (!acquireInFlightLock(lockKey)) {
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "post-fix",
          hypothesisId: "H6",
          location: "create-card-form.tsx:handleSubmit:module-lock-blocked",
          message: "create card blocked by module lock",
          data: { seq, lockKey, columnId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "create-card-form.tsx:handleSubmit:lock-acquired",
        message: "create card lock acquired",
        data: { seq, columnId, title: submittedTitle },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setTitle("");

    startTransition(async () => {
      addOptimisticTitle("");
      try {
        const result = await createCard(fd);
        if ("error" in result) {
          setTitle(submittedTitle);
          setError(result.error);
          return;
        }
        onCardCreated?.(result.cardId, submittedTitle);
      } finally {
        releaseInFlightLock(lockKey);
        submittingRef.current = false;
        setIsSubmitting(false);
        // #region agent log
        fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
          body: JSON.stringify({
            sessionId: "fa60ca",
            runId: "pre-fix",
            hypothesisId: "H4",
            location: "create-card-form.tsx:handleSubmit:finally",
            message: "create card lock released",
            data: { seq, columnId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
    });
  }

  const disabled = pending || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-2 space-y-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}
      data-testid="create-card-form"
    >
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      <input
        name="title"
        value={optimisticTitle}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // #region agent log
            fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
              body: JSON.stringify({
                sessionId: "fa60ca",
                runId: "pre-fix",
                hypothesisId: "H3",
                location: "create-card-form.tsx:title:Enter",
                message: "Enter key on title input",
                data: { columnId, submittingRef: submittingRef.current, pending, isSubmitting },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion
          }
        }}
        placeholder="Novo card"
        required
        disabled={disabled}
        className={inputBoardClassSm}
      />
      <select name="priority" defaultValue="medium" disabled={disabled} className={inputBoardClassSm}>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
        <option value="urgent">urgent</option>
      </select>
      <DatePickerPopover name="dueDate" variant="board" clearLabel="Limpar prazo" />
      <button type="submit" disabled={disabled} className={`w-full ${btnBoardPrimarySm}`}>
        {disabled ? "Adicionando..." : "Adicionar"}
      </button>
      {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
    </form>
  );
}
