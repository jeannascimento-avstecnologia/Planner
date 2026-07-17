"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnNodeDrag,
  MarkerType,
  type IsValidConnection,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { Network, Plus, Unlink } from "lucide-react";
import { createCard, linkTreeEdgeAction, unlinkTreeEdgeAction, updateCardFieldsAction } from "@/app/(app)/boards/[boardId]/card-actions";
import {
  MAX_CARD_TREE_DEPTH,
  canLinkTree,
  canLinkTreeErrorMessage,
  canReparent,
  canReparentErrorMessage,
  countChildrenProgress,
  filterTreeHighlight,
  getDepth,
  getTreeParents,
  layoutWithDagre,
  resolveTreePositions,
  softSnapPosition,
  wouldExceedMaxDepth,
  type TreeFlowPosition,
} from "@/lib/card-tree";
import { treeEdgePairs } from "@/lib/card-tree/tree-edge-pairs";
import { treeHighlightOpacity, treeHighlightPaintKey } from "@/lib/card-tree/tree-highlight-paint";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  applyTreeLinkToList,
  applyTreeUnlinkToList,
  applyCardReparentToList,
} from "@/lib/query/board-cards-cache";
import { btnBoardSecondary, inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { ChecklistEditor } from "./checklist-editor";
import {
  hasActiveFilters,
  matchesFilters,
  memberLabel,
  resolveCardStage,
  type BoardCard,
  type CardFilters,
  type ColumnRow,
  type ProfileRow,
  type StageRow,
  type TagRow,
} from "./types";
import type { CardPriority } from "@nextgen/contracts";

/** Enter/draw once per id (React key de highlight remount não re-anima enter). */
const seenTreeNodeIds = new Set<string>();
const seenTreeEdgeIds = new Set<string>();

/** Handler estável p/ Remover na aresta — chamado do componente de aresta (TreeFlowEdge). */
let treeEdgeRemoveHandler: ((edgeId: string) => void) | null = null;

type Props = {
  boardId: string;
  cards: BoardCard[];
  allCards: BoardCard[];
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  profilesById?: Record<string, ProfileRow>;
  tags?: TagRow[];
  filters: CardFilters;
  canEdit: boolean;
  onSelectCard: (id: string) => void;
};

type TreeNodeData = {
  card: BoardCard;
  boardId: string;
  canEdit: boolean;
  highlightStrong: boolean;
  highlightMuted: boolean;
  highlightDim: boolean;
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  profilesById?: Record<string, ProfileRow>;
  tagsById: Map<string, TagRow>;
  allCards: BoardCard[];
  onSelectCard: (id: string) => void;
  onCreateChild: (parent: BoardCard, title: string) => void;
};

function parseTreeEdgeId(edgeId: string): { parentId: string; childId: string } | null {
  if (!edgeId.startsWith("e:")) return null;
  const rest = edgeId.slice(2);
  const sep = rest.indexOf(":");
  if (sep < 0) return null;
  const parentId = rest.slice(0, sep);
  const childId = rest.slice(sep + 1);
  if (!parentId || !childId) return null;
  return { parentId, childId };
}

function TreeCardFlowNode({ data, selected }: NodeProps) {
  const d = data as TreeNodeData;
  const [childTitle, setChildTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const progress = countChildrenProgress(d.allCards, d.card.id);
  const stage = resolveCardStage(d.card, d.columns, d.stagesById);
  const column = d.columns.find((c) => c.id === d.card.column_id);
  const cardTags = d.card.tagIds
    .map((id) => d.tagsById.get(id))
    .filter((t): t is TagRow => Boolean(t));
  const assignee = d.card.assignee_id ? d.profilesById?.[d.card.assignee_id] : undefined;
  const canAdd =
    d.canEdit &&
    getDepth(d.allCards, d.card.id) < MAX_CARD_TREE_DEPTH &&
    !wouldExceedMaxDepth(d.allCards, d.card.id);
  /** Handle de saída: permite N filhos — só bloqueia no depth máximo do próprio nó. */
  const canConnectOut = d.canEdit && getDepth(d.allCards, d.card.id) < MAX_CARD_TREE_DEPTH;
  const isNewNode = !seenTreeNodeIds.has(d.card.id);
  if (isNewNode) seenTreeNodeIds.add(d.card.id);
  const highlightFlags = {
    strong: d.highlightStrong,
    muted: d.highlightMuted,
    dim: d.highlightDim,
  };
  const highlightPaintKey = treeHighlightPaintKey(highlightFlags);
  const nodeOpacity = treeHighlightOpacity(highlightFlags);

  return (
    <motion.div
      key={highlightPaintKey}
      data-testid={`tree-node-${d.card.id}`}
      data-highlight={highlightPaintKey || "none"}
      initial={isNewNode ? { y: -8, opacity: nodeOpacity } : false}
      animate={{ y: 0, opacity: nodeOpacity }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ opacity: nodeOpacity }}
      className={`w-[240px] rounded-lg border bg-aurora-surface shadow-md ${
        selected || d.highlightStrong
          ? "border-board-accent ring-2 ring-board-accent/40"
          : d.highlightMuted
            ? "border-board-border/60"
            : d.highlightDim
              ? "border-board-border/40"
              : "border-board-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!h-2.5 !w-2.5 !border-2 !border-board-accent !bg-aurora-surface"
      />
      <div className="border-b border-board-border/60 px-2 py-1.5">
        <button
          type="button"
          className="nodrag nopan w-full truncate text-left text-sm font-medium text-aurora-fg hover:underline"
          onClick={() => d.onSelectCard(d.card.id)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {d.card.title}
        </button>
        <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-aurora-muted">
          {column ? (
            <span className="rounded border border-board-border/70 px-1.5 py-0.5" title="Coluna">
              {column.name}
            </span>
          ) : null}
          {stage ? (
            <span className="rounded-full px-1.5 py-0.5 font-medium text-white" style={{ backgroundColor: stage.color }}>
              {stage.name}
            </span>
          ) : null}
          {d.card.assignee_id ? (
            <span
              className="inline-flex max-w-full items-center gap-1 truncate rounded border border-board-border/70 px-1.5 py-0.5 font-medium text-aurora-fg"
              title="Responsavel"
              data-testid={`tree-assignee-${d.card.id}`}
            >
              {assignee ? memberLabel(assignee) : "Responsavel"}
            </span>
          ) : (
            <span className="text-aurora-muted/80" data-testid={`tree-assignee-empty-${d.card.id}`}>
              Sem responsavel
            </span>
          )}
          {progress.total > 0 ? (
            <span data-testid={`tree-progress-${d.card.id}`}>
              {progress.done}/{progress.total}
            </span>
          ) : null}
        </div>
        {cardTags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {cardTags.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: t.color }}
                title="Marcador"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {/* CTA acima do checklist e longe do handle de output (evita “sumir” sob o handle / drag). */}
      {d.canEdit && canAdd ? (
        <div
          className="nodrag nopan border-b border-board-border/40 px-2 py-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {creating ? (
            <form
              className="flex gap-1"
              data-testid={`tree-create-child-${d.card.id}`}
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const t = childTitle.trim();
                if (!t) return;
                d.onCreateChild(d.card, t);
                setChildTitle("");
                setCreating(false);
              }}
            >
              <input
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                placeholder="Novo card filho"
                className={`min-w-0 flex-1 ${inputBoardClassSm}`}
                data-testid="create-child-title"
                autoFocus
              />
              <button type="submit" className={btnBoardSecondary}>
                Criar
              </button>
            </form>
          ) : (
            <button
              type="button"
              data-testid={`tree-add-child-${d.card.id}`}
              className={`inline-flex w-full items-center justify-center gap-1 ${btnBoardSecondary} text-[11px]`}
              onClick={(e) => {
                e.stopPropagation();
                setCreating(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar card Filho
            </button>
          )}
        </div>
      ) : null}
      <div className="px-2 py-1.5 pb-3">
        <ChecklistEditor
          cardId={d.card.id}
          boardId={d.boardId}
          items={d.card.checklistItems}
          canEdit={d.canEdit}
          compact
          collapsed
        />
      </div>
      {canConnectOut ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="out"
          data-testid={`tree-output-handle-${d.card.id}`}
          className="!h-3.5 !w-3.5 !border-2 !border-board-accent !bg-board-accent"
          title="Arraste ate outro card para conectar como filho (varios filhos ok)"
          isConnectable={canConnectOut}
        />
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          id="out"
          className="!opacity-0 !pointer-events-none"
          isConnectable={false}
        />
      )}
    </motion.div>
  );
}

type TreeEdgeData = {
  canEdit?: boolean;
  onRemove?: (edgeId: string) => void;
};

function TreeFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const edgeData = data as TreeEdgeData | undefined;
  const stroke = selected ? "var(--color-board-accent)" : "var(--color-board-border)";
  const strokeWidth = selected ? 3 : 2;
  const isNewEdge = !seenTreeEdgeIds.has(id);
  if (isNewEdge) seenTreeEdgeIds.add(id);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={40}
        style={{ stroke, strokeWidth }}
      />
      {isNewEdge ? (
        <motion.path
          d={edgePath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="pointer-events-none"
          initial={{ pathLength: 0, opacity: 0.35 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      ) : null}
      {edgeData?.canEdit ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10_000,
            }}
          >
            <button
              type="button"
              data-testid="tree-edge-remove"
              title="Remover conexao"
              aria-label="Remover conexao"
              className={`inline-flex items-center gap-1 rounded-md border border-board-border bg-aurora-surface px-2 py-1 text-[11px] font-medium text-aurora-fg shadow-md hover:bg-board-accent-muted/40 ${
                selected ? "opacity-100" : "opacity-80 hover:opacity-100"
              }`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (treeEdgeRemoveHandler ?? edgeData?.onRemove)?.(id);
              }}
            >
              <Unlink className="h-3 w-3" />
              Remover
            </button>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = { treeCard: TreeCardFlowNode };
const edgeTypes = { treeEdge: TreeFlowEdge };

function cardsToFlow(
  cards: BoardCard[],
  positions: TreeFlowPosition[],
  ctx: Omit<TreeNodeData, "card" | "highlightStrong" | "highlightMuted" | "highlightDim"> & {
    highlight: ReturnType<typeof filterTreeHighlight> | null;
    onRemoveEdge: (edgeId: string) => void;
  },
): { nodes: Node[]; edges: Edge[] } {
  const posById = new Map(positions.map((p) => [p.id, p]));
  const filterOn = ctx.highlight != null;
  const nodes: Node[] = cards.map((card) => {
    const p = posById.get(card.id) ?? { id: card.id, x: 0, y: 0 };
    const strong = ctx.highlight?.strongIds.has(card.id) ?? false;
    const muted = ctx.highlight?.mutedIds.has(card.id) ?? false;
    const dim = filterOn && !strong && !muted;
    const opacity = treeHighlightOpacity({ strong, muted, dim });
    return {
      id: card.id,
      type: "treeCard",
      position: { x: p.x, y: p.y },
      // RF aplica style no wrapper do nó — paint de filtro confiável (não só no custom node).
      style: { opacity, transition: "opacity 200ms ease-out" },
      data: {
        card,
        boardId: ctx.boardId,
        canEdit: ctx.canEdit,
        highlightStrong: strong,
        highlightMuted: muted,
        highlightDim: dim,
        columns: ctx.columns,
        stagesById: ctx.stagesById,
        profilesById: ctx.profilesById,
        tagsById: ctx.tagsById,
        allCards: ctx.allCards,
        onSelectCard: ctx.onSelectCard,
        onCreateChild: ctx.onCreateChild,
      } satisfies TreeNodeData,
      draggable: ctx.canEdit,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[] = treeEdgePairs(cards).map(({ parentId, childId }) => ({
    id: `e:${parentId}:${childId}`,
    source: parentId,
    target: childId,
    sourceHandle: "out",
    targetHandle: "in",
    type: "treeEdge",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    data: { canEdit: ctx.canEdit, onRemove: ctx.onRemoveEdge } satisfies TreeEdgeData,
    selectable: ctx.canEdit,
    focusable: ctx.canEdit,
    interactionWidth: 72,
  }));

  return { nodes, edges };
}

function TreeFlowInner({
  boardId,
  cards,
  allCards,
  columns,
  stagesById,
  profilesById,
  tags = [],
  filters,
  canEdit,
  onSelectCard,
}: Props) {
  const queryClient = useQueryClient();
  const { fitView } = useReactFlow();
  const [pending, startTransition] = useTransition();
  const [selectedEdgeId, setSelectedEdgeIdState] = useState<string | null>(null);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const setSelectedEdgeId = useCallback((id: string | null) => {
    selectedEdgeIdRef.current = id;
    setSelectedEdgeIdState(id);
  }, []);
  const posTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const warnRef = useRef(false);
  const allCardsRef = useRef(allCards);
  allCardsRef.current = allCards;
  const onSelectCardRef = useRef(onSelectCard);
  onSelectCardRef.current = onSelectCard;
  const stableSelectCard = useCallback((id: string) => {
    onSelectCardRef.current(id);
  }, []);
  const initialRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const reparentQueue = useRef<Promise<void>>(Promise.resolve());
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      invalidateTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
    }, 600);
  }, [boardId, queryClient]);

  useEffect(() => {
    return () => {
      for (const t of posTimers.current.values()) clearTimeout(t);
      posTimers.current.clear();
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    };
  }, []);

  const highlight = useMemo(() => {
    if (!hasActiveFilters(filters)) return null;
    return filterTreeHighlight(allCards, (c) => matchesFilters(c, filters, { columns, stagesById }));
  }, [allCards, filters, columns, stagesById]);

  // Highlight/dim in-place; topologia estável (todos os cards).
  const visibleCards = cards;

  const filterEmpty =
    hasActiveFilters(filters) && highlight != null && highlight.strongIds.size === 0;
  const filterEmptyToasted = useRef(false);

  useEffect(() => {
    if (!filterEmpty) {
      filterEmptyToasted.current = false;
      return;
    }
    if (filterEmptyToasted.current) return;
    filterEmptyToasted.current = true;
    appToast.info("Nenhum card corresponde aos filtros");
  }, [filterEmpty]);

  useEffect(() => {
    if (allCards.length > 300 && !warnRef.current) {
      warnRef.current = true;
      appToast.info("Arvore grande (>300 nos) — pan/zoom pode ficar mais lento");
    }
  }, [allCards.length]);

  const commitLink = useCallback(
    (childId: string, parentId: string) => {
      const run = async () => {
        const cardsNow = allCardsRef.current;
        const guard = canLinkTree(cardsNow, childId, parentId);
        if (!guard.ok) {
          if (guard.reason !== "noop") appToast.error(canLinkTreeErrorMessage(guard.reason));
          return;
        }
        const key = boardCardsQueryKey(boardId);
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<BoardCard[]>(key);
        if (previous) {
          const updated = applyTreeLinkToList(previous, childId, parentId);
          queryClient.setQueryData(key, updated);
          // Keep allCardsRef fresh so subsequent links (multi-parent) see the new edge
          allCardsRef.current = updated;
        }
        const result = await linkTreeEdgeAction({
          boardId,
          parentCardId: parentId,
          childCardId: childId,
        });
        if (!result.ok) {
          if (previous) queryClient.setQueryData(key, previous);
          appToast.error(result.error);
          return;
        }
        appToast.success("Aresta multi-pai conectada");
        scheduleInvalidate();
      };
      reparentQueue.current = reparentQueue.current.then(run, run);
      return reparentQueue.current;
    },
    [boardId, queryClient, scheduleInvalidate],
  );

  const commitUnlink = useCallback(
    (childId: string, parentId: string) => {
      const run = async () => {
        const key = boardCardsQueryKey(boardId);
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<BoardCard[]>(key);
        if (previous) {
          const updated = applyTreeUnlinkToList(previous, childId, parentId);
          queryClient.setQueryData(key, updated);
          allCardsRef.current = updated;
        }
        const result = await unlinkTreeEdgeAction({
          boardId,
          parentCardId: parentId,
          childCardId: childId,
        });
        if (!result.ok) {
          if (previous) queryClient.setQueryData(key, previous);
          appToast.error(result.error);
          throw new Error(result.error);
        }
        appToast.success("Conexao removida");
        scheduleInvalidate();
      };
      reparentQueue.current = reparentQueue.current.then(run, run);
      return reparentQueue.current;
    },
    [boardId, queryClient, scheduleInvalidate],
  );

  const commitReparent = useCallback(
    (cardId: string, newParentId: string | null) => {
      const run = async () => {
        const cardsNow = allCardsRef.current;
        const guard = canReparent(cardsNow, cardId, newParentId);
        if (!guard.ok) {
          if (guard.reason !== "noop") appToast.error(canReparentErrorMessage(guard.reason));
          return;
        }
        const card = cardsNow.find((c) => c.id === cardId);
        if (!card) return;
        // Promote to root: unlink all tree parents
        if (newParentId === null) {
          for (const p of getTreeParents(card)) {
            await unlinkTreeEdgeAction({
              boardId,
              parentCardId: p,
              childCardId: cardId,
            });
          }
          const key = boardCardsQueryKey(boardId);
          const previous = queryClient.getQueryData<BoardCard[]>(key);
          if (previous) {
            let next = previous;
            for (const p of getTreeParents(card)) {
              next = applyTreeUnlinkToList(next, cardId, p);
            }
            queryClient.setQueryData(key, next);
          }
          appToast.success("Promovido a raiz");
          scheduleInvalidate();
          return;
        }
        // Execute linkTreeEdgeAction BEFORE updateCardFieldsAction so the legacy parent is properly materialized.
        // We DO NOT call `commitLink` here because `commitLink` queues into `reparentQueue` which we are currently executing!
        const key = boardCardsQueryKey(boardId);
        const previous = queryClient.getQueryData<BoardCard[]>(key);
        if (previous) {
          const optimisticLink = applyTreeLinkToList(previous, cardId, newParentId);
          queryClient.setQueryData(key, optimisticLink);
          allCardsRef.current = optimisticLink;
        }

        const linkResult = await linkTreeEdgeAction({
          boardId,
          parentCardId: newParentId,
          childCardId: cardId,
        });

        if (!linkResult.ok) {
          if (previous) queryClient.setQueryData(key, previous);
          appToast.error(linkResult.error);
          return;
        }

        try {
          await updateCardFieldsAction({
            boardId,
            cardId,
            fields: { parentId: newParentId },
          });
          // Update cache optimistically for Kanban sync
          const prevNow = queryClient.getQueryData<BoardCard[]>(key);
          if (prevNow) {
            const next = applyCardReparentToList(prevNow, cardId, newParentId);
            queryClient.setQueryData(key, next);
            allCardsRef.current = next;
          }
        } catch {
          appToast.error("Falha ao mover na estrutura");
          return;
        }
      };

      reparentQueue.current = reparentQueue.current.then(run, run);
      return reparentQueue.current;
    },
    [boardId, queryClient, scheduleInvalidate, commitLink],
  );

  const persistPosition = useCallback(
    (cardId: string, x: number, y: number) => {
      const existing = posTimers.current.get(cardId);
      if (existing) clearTimeout(existing);
      posTimers.current.set(
        cardId,
        setTimeout(() => {
          posTimers.current.delete(cardId);
          const key = boardCardsQueryKey(boardId);
          const prev = queryClient.getQueryData<BoardCard[]>(key);
          if (prev) {
            queryClient.setQueryData(
              key,
              prev.map((c) => (c.id === cardId ? { ...c, tree_x: x, tree_y: y } : c)),
            );
          }
          void updateCardFieldsAction({
            cardId,
            patch: { tree_x: x, tree_y: y },
          }).then((r) => {
            if (!r.ok) {
              appToast.error(r.error);
              void queryClient.invalidateQueries({ queryKey: key });
            }
          });
        }, 300),
      );
    },
    [boardId, queryClient],
  );

  const onCreateChild = useCallback(
    (parent: BoardCard, title: string) => {
      const fd = new FormData();
      fd.set("boardId", boardId);
      fd.set("columnId", parent.column_id);
      // Sem parentId: card raiz em Kanban/tabela/calendário; hierarquia só via card_tree_edges.
      fd.set("title", title);
      const key = boardCardsQueryKey(boardId);
      startTransition(async () => {
        try {
          const result = await createCard(fd);
          if ("error" in result) {
            appToast.error(result.error);
            return;
          }
          const linked = await linkTreeEdgeAction({
            boardId,
            parentCardId: parent.id,
            childCardId: result.cardId,
          });
          if (!linked.ok) {
            appToast.error(linked.error);
            // Card raiz já existe — invalida para aparecer nas outras views mesmo sem aresta.
            void queryClient.invalidateQueries({ queryKey: key });
            return;
          }
          const previous = queryClient.getQueryData<BoardCard[]>(key) ?? [];
          const stub: BoardCard = {
            id: result.cardId,
            column_id: parent.column_id,
            position: parent.position,
            parent_id: null,
            tree_x: null,
            tree_y: null,
            title,
            description: null,
            priority: "medium" as CardPriority,
            due_date: null,
            start_date: null,
            target_date: null,
            estimated_hours: null,
            story_points: null,
            assignee_id: null,
            completed_at: null,
            stage_id: null,
            tagIds: [],
            checklistItems: [],
            treeParentIds: [parent.id],
            tiflux_ticket_number: null,
            tiflux_ticket_id: null,
            tiflux_canceled_tickets: [],
          };
          const withoutDup = previous.filter((c) => c.id !== result.cardId);
          queryClient.setQueryData(
            key,
            applyTreeLinkToList([...withoutDup, stub], result.cardId, parent.id),
          );
          appToast.success("Card criado");
          void queryClient.invalidateQueries({ queryKey: key });
        } catch {
          appToast.error(
            "Falha ao criar card (acao do servidor desatualizada). Recarregue a pagina e tente de novo.",
          );
        }
      });
    },
    [boardId, queryClient],
  );

  /** Ref estável: node.data do React Flow nao atualiza quando so o callback muda (topologyKey). */
  const onCreateChildRef = useRef(onCreateChild);
  onCreateChildRef.current = onCreateChild;
  const stableCreateChild = useCallback((parent: BoardCard, title: string) => {
    onCreateChildRef.current(parent, title);
  }, []);

  const initial = useMemo(() => {
    const source = visibleCards;
    const positions = resolveTreePositions(source.length ? source : []);
    const flow = cardsToFlow(source, positions, {
      boardId,
      canEdit,
      columns,
      stagesById,
      profilesById,
      tagsById,
      allCards,
      onSelectCard: stableSelectCard,
      onCreateChild: stableCreateChild,
      highlight,
      onRemoveEdge: (edgeId) => {
        if (removeEdgeByIdRef.current) removeEdgeByIdRef.current(edgeId);
      },
    });
    initialRef.current = flow;
    return flow;
  }, [
    visibleCards,
    allCards,
    boardId,
    canEdit,
    columns,
    stagesById,
    profilesById,
    tagsById,
    stableSelectCard,
    stableCreateChild,
    highlight,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  /** Impede syncGraph de repor aresta enquanto unlink está in-flight (H-restore). */
  const pendingUnlinkIdsRef = useRef<Set<string>>(new Set());

  const removeEdgeByIdRef = useRef<(edgeId: string) => void>(() => {});

  /**
   * Remove aresta do estado RF local imediatamente e persiste o unlink no servidor.
   * Não usa deleteElements (async/frágil) — manipula setEdges diretamente.
   */
  const persistEdgeUnlink = useCallback(
    (edgeId: string) => {
      const parsed = parseTreeEdgeId(edgeId);
      if (!parsed) return;
      pendingUnlinkIdsRef.current.add(edgeId);
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      selectedEdgeIdRef.current = null;
      setSelectedEdgeId(null);
      startTransition(() => {
        void (async () => {
          try {
            await commitUnlink(parsed.childId, parsed.parentId);
            window.setTimeout(() => {
              pendingUnlinkIdsRef.current.delete(edgeId);
            }, 1500);
          } catch {
            pendingUnlinkIdsRef.current.delete(edgeId);
            void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
          }
        })();
      });
    },
    [boardId, commitUnlink, queryClient, setEdges],
  );
  removeEdgeByIdRef.current = persistEdgeUnlink;
  // Handler global acessível pelo componente TreeFlowEdge
  treeEdgeRemoveHandler = persistEdgeUnlink;

  const removeSelectedEdge = useCallback(() => {
    const edgeId = selectedEdgeIdRef.current;
    if (!edgeId) return;
    persistEdgeUnlink(edgeId);
  }, [persistEdgeUnlink]);

  /** Safety net: se RF deletar arestas por outro caminho, persiste o unlink. */
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        persistEdgeUnlink(e.id);
      }
    },
    [persistEdgeUnlink],
  );

  const topologyKey = useMemo(
    () =>
      visibleCards
        .map((c) => `${c.id}:${getTreeParents(c).join(",")}`)
        .sort()
        .join("|"),
    [visibleCards],
  );

  const highlightKey = useMemo(() => {
    // Inclui assinatura do filtro — empty→empty e stage-only disparam paint (vídeo Concluído).
    const sig = [
      filters.text.trim(),
      filters.stageIds.slice().sort().join(","),
      filters.tagIds.slice().sort().join(","),
      filters.assignees.slice().sort().join(","),
      String(filters.duePreset ?? ""),
      filters.dueExact ?? "",
    ].join(";");
    if (!highlight) return `none:${sig}`;
    return [
      sig,
      [...highlight.strongIds].sort().join(","),
      [...highlight.mutedIds].sort().join(","),
      filterEmpty ? "empty" : "hit",
    ].join("|");
  }, [highlight, filters, filterEmpty]);

  // Topologia (nós/arestas) — NÃO rodar só por filtro (evita repor aresta após unlink).
  useEffect(() => {
    const next = initialRef.current;
    const pending = pendingUnlinkIdsRef.current;
    const nextEdges = next.edges.filter((e) => !pending.has(e.id));
    setNodes((prev) => {
      const prevPos = new Map(prev.map((n) => [n.id, n.position]));
      return next.nodes.map((n) => {
        const pos = prevPos.get(n.id);
        return pos ? { ...n, data: n.data, position: pos } : n;
      });
    });
    setEdges(
      nextEdges.map((e) => ({
        ...e,
        selected: e.id === selectedEdgeIdRef.current,
        data: { ...e.data, canEdit, onRemove: removeEdgeByIdRef.current },
        interactionWidth: 72,
      })),
    );
  }, [topologyKey, canEdit, setNodes, setEdges]);

  // Highlight/filtro: patch `data` + `style.opacity` no Node RF — não mexe em edges.
  useEffect(() => {
    const next = initialRef.current;
    const byId = new Map(next.nodes.map((n) => [n.id, n]));
    setNodes((prev) =>
      prev.map((n) => {
        const fresh = byId.get(n.id);
        if (!fresh) return n;
        return { ...n, data: fresh.data, style: fresh.style };
      }),
    );
  }, [highlightKey, setNodes]);

  // Aplica seleção de aresta sem resetar o grafo.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === selectedEdgeId,
        data: { ...e.data, canEdit, onRemove: removeEdgeByIdRef.current },
      })),
    );
  }, [selectedEdgeId, canEdit, setEdges]);

  // NÃO limpar seleção quando RF emite edges=[] (clique no botão fora do canvas).
  const onSelectionChange = useCallback<OnSelectionChangeFunc>(({ edges: selEdges }) => {
    const id = selEdges[0]?.id;
    if (id) {
      selectedEdgeIdRef.current = id;
      setSelectedEdgeId(id);
    }
  }, []);
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      if (!canEdit || !connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      return canLinkTree(allCardsRef.current, connection.target, connection.source).ok;
    },
    [canEdit],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit || !connection.source || !connection.target) return;
      if (!isValidConnection(connection)) {
        appToast.error("Conexao invalida (ciclo, profundidade ou ja conectado).");
        return;
      }
      startTransition(() => {
        void commitLink(connection.target!, connection.source!);
      });
    },
    [canEdit, commitLink, isValidConnection],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_evt, _node, all) => {
      if (!canEdit) return;
      const selected = all.filter((n) => n.selected);
      const moving = selected.length > 0 ? selected : all.filter((n) => n.id === _node.id);
      const others: TreeFlowPosition[] = all
        .filter((n) => !moving.some((m) => m.id === n.id))
        .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));

      const snappedMoves: { id: string; x: number; y: number }[] = [];
      for (const node of moving) {
        const snapped = softSnapPosition(node.id, node.position.x, node.position.y, [
          ...others,
          ...snappedMoves,
        ]);
        snappedMoves.push({ id: node.id, x: snapped.x, y: snapped.y });
      }

      setNodes((nds) =>
        nds.map((n) => {
          const m = snappedMoves.find((s) => s.id === n.id);
          return m ? { ...n, position: { x: m.x, y: m.y } } : n;
        }),
      );
      for (const m of snappedMoves) {
        persistPosition(m.id, m.x, m.y);
      }
    },
    [canEdit, persistPosition, setNodes],
  );

  const organize = useCallback(() => {
    const laid = layoutWithDagre(allCards);
    setNodes((nds) =>
      nds.map((n) => {
        const p = laid.find((x) => x.id === n.id);
        return p ? { ...n, position: { x: p.x, y: p.y } } : n;
      }),
    );
    startTransition(async () => {
      const CHUNK = 8;
      for (let i = 0; i < laid.length; i += CHUNK) {
        const slice = laid.slice(i, i + CHUNK);
        await Promise.all(
          slice.map((p) =>
            updateCardFieldsAction({
              cardId: p.id,
              patch: { tree_x: p.x, tree_y: p.y },
            }),
          ),
        );
      }
      scheduleInvalidate();
      appToast.success("Arvore organizada");
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
    });
  }, [allCards, setNodes, scheduleInvalidate, fitView]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.key === "Delete" || e.key === "Backspace")) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selectedEdgeId || !canEdit) return;
      e.preventDefault();
      removeSelectedEdge();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEdgeId, canEdit, removeSelectedEdge]);

  if (allCards.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-board-border p-6 text-center text-sm text-aurora-muted">
        Nenhum card na arvore.
      </p>
    );
  }

  const selectedEdgeLabel = (() => {
    if (!selectedEdgeId) return null;
    const parsed = parseTreeEdgeId(selectedEdgeId);
    if (!parsed) return selectedEdgeId;
    const parent = allCards.find((c) => c.id === parsed.parentId);
    const child = allCards.find((c) => c.id === parsed.childId);
    return `${parent?.title ?? "Pai"} → ${child?.title ?? "Filho"}`;
  })();

  return (
    <div
      data-testid="board-tree-view"
      data-tour="board-tree-view"
      data-org-chart-canvas=""
      className="flex h-[min(70vh,720px)] min-h-[420px] flex-col gap-2"
    >
      {canEdit ? (
        <div className="space-y-2" data-testid="tree-top-banner">
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="tree-organize"
            className={btnBoardSecondary}
            disabled={pending}
            onClick={organize}
          >
            <Network className="mr-1 inline h-3.5 w-3.5" />
            Organizar arvore
          </button>
          <button
            type="button"
            data-testid="tree-fit-view"
            className={btnBoardSecondary}
            onClick={() => fitView({ padding: 0.2, duration: 250 })}
          >
            Ajustar vista
          </button>
          {selectedEdgeId ? (
            <button
              type="button"
              data-testid="tree-edge-remove"
              className={btnBoardSecondary}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeSelectedEdge();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeSelectedEdge();
              }}
              title={selectedEdgeLabel ?? undefined}
            >
              <Unlink className="mr-1 inline h-3.5 w-3.5" />
              Remover conexao
            </button>
          ) : null}
          </div>
          {!selectedEdgeId ? (
            <p
              data-testid="tree-banner-help"
              className="max-w-3xl text-sm leading-snug text-aurora-muted"
            >
              Como usar: role para zoom · botao do meio ou direito para mover a tela ·
              arraste do ponto de baixo de um card ate o de cima de outro para conectar ·
              selecione a ligacao e use Remover (ou Delete) · Adicionar card Filho cria um card
              na mesma coluna, visivel tambem no Kanban, Tabela e Calendario.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-board-border" data-testid="board-tree-canvas">
          {filterEmpty ? (
            <div
              data-testid="tree-filter-empty"
              className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-aurora-bg/40 px-3 pt-6"
            >
              <div className="rounded-md border border-board-accent bg-aurora-surface px-4 py-3 text-center text-sm font-medium text-aurora-fg shadow-lg">
                Nenhum card corresponde aos filtros
              </div>
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={canEdit ? onNodesChange : undefined}
            onEdgesChange={canEdit ? onEdgesChange : undefined}
            onConnect={canEdit ? onConnect : undefined}
            isValidConnection={canEdit ? isValidConnection : undefined}
            onSelectionChange={onSelectionChange}
            onEdgeClick={
              canEdit
                ? (_evt, edge) => {
                    setSelectedEdgeId(edge.id);
                  }
                : undefined
            }
            onEdgesDelete={canEdit ? onEdgesDelete : undefined}
            onEdgeDoubleClick={
              canEdit
                ? (evt, edge) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    persistEdgeUnlink(edge.id);
                  }
                : undefined
            }
            onPaneClick={() => setSelectedEdgeId(null)}
            onNodeDoubleClick={(_evt, node) => onSelectCard(node.id)}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            onlyRenderVisibleElements
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            elementsSelectable
            edgesFocusable={canEdit}
            panOnDrag={[1, 2]}
            zoomOnScroll
            panOnScroll={false}
            selectionOnDrag={false}
            multiSelectionKeyCode="Shift"
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: "treeEdge", interactionWidth: 64 }}
            connectionRadius={28}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-aurora-surface" />
          </ReactFlow>
      </div>
    </div>
  );
}

export function BoardTreeView(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeFlowInner {...props} />
    </ReactFlowProvider>
  );
}
