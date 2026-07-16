# ADR-0013: Canvas Árvore com @xyflow/react + Dagre

- Status: Aceito
- Data: 2026-07-16
- Plano: Tree Canvas Interactive (`D.Tree.Canvas`)

## Contexto

A view `?view=tree` usava layout absoluto custom (`layoutOrgChart`). O produto pede canvas dinâmico (pan/zoom, drag livre com posição persistida, auto-organizar, handles N8N). Reinventar pan/zoom/virtualização é frágil e caro.

## Decisão

| Peça | Escolha |
|------|---------|
| Canvas | `@xyflow/react` v12 (React Flow) — só no chunk `view=tree` (`dynamic` + `ssr: false`) |
| Auto-layout | `@dagrejs/dagre` TB; botão “Organizar árvore”; coords null → Dagre na carga |
| Persistência | `cards.tree_x` / `cards.tree_y` (numeric nullable); patch via `update_card_fields` |
| Hierarquia | Continua `cards.parent_id` (edges derivados); checklist inalterado |
| Viewport | Só cliente (Zustand/session); sem persistir pan/zoom no servidor |

## Performance

- `onlyRenderVisibleElements`
- `nodeTypes` / `edgeTypes` estáveis fora do render
- Debounce 300ms em `tree_x/y`; **sem** `revalidatePlanViews` / `revalidatePath` board a cada drag **ou** reparent
- Patches só `parent_id` | `tree_x` | `tree_y` → sem `revalidateBoard` pesado (TanStack Query client = SoT)
- Fila de reparent (1 in-flight); sync de edges sem wipe de posições locais
- Soft warn se forest > 300 nós
- Marquee multi-select; persistência de grupo com debounce compartilhado

## Segurança (canvas)

- Mutações só com `canEdit` + RLS/`update_card_fields` (field ACL)
- `isValidConnection` client espelha `canReparent` (anti-ciclo / depth); servidor é autoridade
- Viewer: `nodesConnectable=false`, sem handles de output ativos
- Sem segredos no cliente; Zod em actions

## Alternativas rejeitadas

- Manter SVG/absolute custom: sem pan/zoom/virtualização de qualidade
- ELK: bundle/complexidade excessivos para árvore TB
- Force-directed contínuo: risco de FPS

## Consequências

- Nova dep npm no `apps/web`; ADR-0010 ganha linha xyflow/dagre via este ADR
- Field-level: `tree_x` / `tree_y` entram em `CARD_PERMISSION_FIELDS`
