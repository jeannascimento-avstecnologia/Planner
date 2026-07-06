"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { Editor, TLEditorSnapshot } from "@tldraw/editor";
import { getSnapshot, loadSnapshot } from "tldraw";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@nextgen/contracts";
import "tldraw/tldraw.css";

const Tldraw = dynamic(
  async () => {
    try {
      const mod = await import("tldraw");
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "whiteboard-debug",
          hypothesisId: "H1",
          location: "board-whiteboard-editor.tsx:dynamic-import",
          message: "tldraw dynamic import ok",
          data: { hasTldraw: Boolean(mod.Tldraw) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return mod.Tldraw;
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "whiteboard-debug",
          hypothesisId: "H1",
          location: "board-whiteboard-editor.tsx:dynamic-import",
          message: "tldraw dynamic import failed",
          data: { error: err instanceof Error ? err.message : String(err) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw err;
    }
  },
  {
    ssr: false,
    loading: () => <p className="p-8 text-sm text-aurora-muted">Carregando whiteboard…</p>,
  },
);

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
  const listenCount = useRef(0);
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
        } catch (err) {
          // #region agent log
          fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
            body: JSON.stringify({
              sessionId: "fa60ca",
              runId: "whiteboard-post-fix",
              hypothesisId: "H4",
              location: "board-whiteboard-editor.tsx:getSnapshot-error",
              message: "getSnapshot failed",
              data: { error: err instanceof Error ? err.message : String(err) },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          persistInFlight.current = false;
          return;
        }

        skipRemoteUntil.current = Date.now() + 1500;
        const { error } = await supabase.rpc("upsert_whiteboard_snapshot", {
          p_board_id: boardId,
          p_snapshot: snapshot as unknown as Json,
        });
        // #region agent log
        fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
          body: JSON.stringify({
            sessionId: "fa60ca",
            runId: "whiteboard-post-fix",
            hypothesisId: "H5",
            location: "board-whiteboard-editor.tsx:persist",
            message: "whiteboard persist rpc",
            data: {
              boardId,
              ok: !error,
              rpcError: error?.message ?? null,
              rpcCode: error?.code ?? null,
              snapshotBytes: JSON.stringify(snapshot).length,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

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

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "whiteboard-debug",
        hypothesisId: "H2",
        location: "board-whiteboard-editor.tsx:mount",
        message: "whiteboard editor mount",
        data: {
          boardId,
          canEdit,
          userId,
          hasValidSnapshot: Boolean(snapshotProp),
          initialSnapshotKeys: Object.keys(initialSnapshot ?? {}),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [boardId, canEdit, snapshotProp, initialSnapshot, userId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const logSize = (source: string) => {
      const tl = el.querySelector(".tl-container") as HTMLElement | null;
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "whiteboard-debug",
          hypothesisId: "H3",
          location: "board-whiteboard-editor.tsx:layout",
          message: "whiteboard container size",
          data: {
            source,
            containerW: el.clientWidth,
            containerH: el.clientHeight,
            tlW: tl?.clientWidth ?? 0,
            tlH: tl?.clientHeight ?? 0,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    logSize("mount");
    const ro = new ResizeObserver(() => logSize("resize"));
    ro.observe(el);
    const t = window.setTimeout(() => logSize("delayed-500ms"), 500);
    const t2 = window.setTimeout(() => logSize("delayed-2s"), 2000);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

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

          const unsub = editor.store.listen(
            () => {
              listenCount.current += 1;
              if (listenCount.current <= 3 || listenCount.current % 50 === 0) {
                // #region agent log
                fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
                  body: JSON.stringify({
                    sessionId: "fa60ca",
                    runId: "whiteboard-post-fix",
                    hypothesisId: "H4",
                    location: "board-whiteboard-editor.tsx:store-listen",
                    message: "user document change scheduled",
                    data: {
                      listenCount: listenCount.current,
                      shapeCount: editor.getCurrentPageShapeIds().size,
                    },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
              }
              schedulePersist();
            },
            { source: "user", scope: "document" },
          );

          // #region agent log
          fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
            body: JSON.stringify({
              sessionId: "fa60ca",
              runId: "whiteboard-debug",
              hypothesisId: "H2-H3",
              location: "board-whiteboard-editor.tsx:onMount",
              message: "tldraw editor mounted",
              data: {
                boardId,
                isReadonly,
                currentTool: editor.getCurrentToolId(),
                pageShapeCount: editor.getCurrentPageShapeIds().size,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          return unsub;
        }}
      />
    </div>
  );
}
