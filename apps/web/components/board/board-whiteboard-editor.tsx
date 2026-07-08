"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { Editor, TLEditorSnapshot } from "@tldraw/editor";
import { getSnapshot, loadSnapshot } from "tldraw";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@nextgen/contracts";
import "tldraw/tldraw.css";

const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => <p className="p-8 text-sm text-aurora-muted">Carregando whiteboard…</p>,
});

type Props = {
  boardId: string;
  initialSnapshot: Record<string, unknown>;
  canEdit: boolean;
  userId: string;
};

function isTldrawSnapshot(value: unknown): value is TLEditorSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as TLEditorSnapshot;
  if (snap.document) return true;
  if ("store" in snap && snap.store) return true;
  return false;
}

export function BoardWhiteboardEditor({ boardId, initialSnapshot, canEdit, userId }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistInFlight = useRef(false);
  const persistPending = useRef(false);
  const skipRemoteUntil = useRef(0);
  const supabase = createClient();

  const snapshotProp = isTldrawSnapshot(initialSnapshot) ? initialSnapshot : undefined;

  const schedulePersist = useCallback(() => {
    if (!canEdit) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void (async () => {
        if (persistInFlight.current) {
          persistPending.current = true;
          return;
        }
        const editor = editorRef.current;
        if (!editor) return;

        persistInFlight.current = true;
        let snapshot: TLEditorSnapshot;
        try {
          snapshot = getSnapshot(editor.store);
        } catch {
          persistInFlight.current = false;
          return;
        }

        skipRemoteUntil.current = Date.now() + 1500;
        await supabase.rpc("upsert_whiteboard_snapshot", {
          p_board_id: boardId,
          p_snapshot: snapshot as unknown as Json,
        });

        persistInFlight.current = false;
        if (persistPending.current) {
          persistPending.current = false;
          schedulePersist();
        }
      })();
    }, 1000);
  }, [boardId, canEdit, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`whiteboard:${boardId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "board_whiteboards", filter: `board_id=eq.${boardId}` },
        async (payload) => {
          const row = payload.new as { snapshot?: TLEditorSnapshot; updated_by?: string | null };
          if (Date.now() < skipRemoteUntil.current) return;
          if (row.updated_by && row.updated_by === userId) return;
          if (!row.snapshot || !editorRef.current || !isTldrawSnapshot(row.snapshot)) return;
          loadSnapshot(editorRef.current.store, row.snapshot, { forceOverwriteSessionState: true });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardId, supabase, userId]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-12rem)] overflow-hidden rounded-lg border border-aurora-border"
      data-testid="whiteboard-editor"
    >
      <Tldraw
        className="h-full w-full"
        autoFocus
        snapshot={snapshotProp}
        onMount={(editor) => {
          editorRef.current = editor;
          const isReadonly = !canEdit;
          if (isReadonly) {
            editor.updateInstanceState({ isReadonly: true });
          }

          return editor.store.listen(() => schedulePersist(), { source: "user", scope: "document" });
        }}
      />
    </div>
  );
}
