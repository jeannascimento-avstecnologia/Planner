# Dossiê de Gargalos — Kanban / Tree / Shell

> **Role:** Red Team Performance / Chaos (static + dry-run)  
> **Data:** 2026-07-17  
> **Escopo:** hot paths recentes (Kanban DnD, Tree React Flow, shell `fillViewport`)  
> **Spec/budget:** [`performance-budgets.md`](./performance-budgets.md)  
> **Guia:** Supabase-first; sem back-end separado; `dnd-kit`; Zero-Breakage (sem mutilar dados/regras/layout)  
> **Declaração:** `Guia+Plano lidos | spec: docs/60-quality/performance-budgets.md | escopo: MVP (dossier)`

---

## 1. Cenários

| ID | Cenário | Tipo | Como exercitar | Risco Zero-Breakage |
|----|---------|------|----------------|---------------------|
| S1 | Kanban 8 colunas × N cards (N=300/500/1000/2000) | Visual / main-thread | Abrir board; scroll colunas; DnD | Alto se virtualizar sem preservar ordem fractional |
| S2 | DnD dragOver contínuo (60+ moves) | CPU + React commit | Arrastar card entre colunas | Médio — cache de container não muda UX |
| S3 | Swimlanes “agrupar por responsável” | Visual O(n·m) | Toggle groupByAssignee | Baixo |
| S4 | Tree canvas N nós + edges (warn >300) | Visual / RF state | `?view=tree`; pan/zoom; marquee | Alto se cortar nós fora do viewport do *estado* |
| S5 | Tree node paint: `getDepth` × N | CPU O(n²) | Render/reparent/filter | Baixo — index de depth |
| S6 | Realtime storm (multi-user edits) | I/O + invalidate | Vários clients editando cards | Médio — debounce já 75ms |
| S7 | Board snapshot 2 waves + `.in(cardIds)` | I/O / URL limit | Board com milhares de cards | Alto se chunking errar tags/checklist |
| S8 | HTTP load rotas auth | Latency p95 | `scripts/perf-stress.mjs` (prod) | N/A (read-only) |
| S9 | Shell flex viewport kanban | Layout / scroll | `fillViewport` + `h-dvh` | Layout visual — não “otimizar” quebrando overflow |

**Scripts:**

- HTTP (auth): [`scripts/perf-stress.mjs`](../../scripts/perf-stress.mjs) — **medir em `next start`**, não em `next dev`.
- CPU UI dry-run (sem DB/HTTP/tenant): [`scripts/ui-render-stress-bench.mjs`](../../scripts/ui-render-stress-bench.mjs)

```bash
node scripts/ui-render-stress-bench.mjs --sizes 50,100,300,500,1000,2000
# prod HTTP (quando Playwright browsers ok):
# node scripts/perf-stress.mjs --base http://localhost:3001 --concurrency 10 --requests 50
```

---

## 2. Métricas

### 2.1 Budgets oficiais (server, prod)

Fonte: [`performance-budgets.md`](./performance-budgets.md)

| Rota | Budget p95 | Baseline stress (dev, doc) |
|------|------------|----------------------------|
| `/boards` | **< 600ms** | 4663ms (30 concurrent) |
| `/boards/[boardId]` | **< 800ms** | 5433ms (30 concurrent) |
| Carga 10 concurrent | **< 3000ms** p95, 0×5xx | ~12–19s |
| Tree | soft warn **>300 nós**; debounce pos ≥300ms; `onlyRenderVisibleElements` | — |

### 2.2 Proxy UI (este pass)

| Proxy | Limite |
|-------|--------|
| Frame budget | **16ms** (jank) |
| Bloqueio main-thread | **>100ms** = CRITICAL |

### 2.3 Resultados dry-run CPU (`ui-render-stress-bench.mjs`, 2026-07-17)

| N | progressNaive (Kanban badge) | progressIndexed | getDepth×2/nó (Tree) | allocTileProps |
|---|------------------------------|-----------------|----------------------|----------------|
| 300 | 0.41ms | 0.05ms | 7.37ms | 0.44ms |
| 500 | 1.22ms | 0.08ms | **17.17ms JANK** | 1.17ms |
| 1000 | 4.9ms | 0.15ms | **65.76ms JANK** | 5.34ms |
| 2000 | **19.09ms JANK** | 0.36ms | **244.88ms CRITICAL** | **19.76ms JANK** |

- Scaling `progressNaive` 100→1000 ≈ **12.9×** (custo já relevante sob React commit + DnD).
- Indexed mitigation ≈ **7.5×** no mesmo intervalo e **~50× mais rápido** em N=2000 (19ms → 0.36ms).

### 2.4 HTTP local (este pass)

| Medição | Resultado | Nota |
|---------|-----------|------|
| `GET /login` 10×30 | p95 **~333ms**, 0 erros | Unauth OK |
| `GET /boards` unauth | 307 rápido (p95 ~39ms) | **Não** mede TTFB autenticado |
| Auth `perf-stress.mjs` | **bloqueado** (Playwright Chromium ausente no sandbox) | Re-rodar após `npx playwright install` |
| Dev terminal (sessão) | `/boards` **4127ms**, board **4029ms** (200) | `next dev` + compile — **fora** do budget prod; só sinal |

---

## 3. Gargalos (arquivo:linha)

Prioridade = impacto × probabilidade sob carga real.

### P0 — Tree: `getDepth` por nó reconstrói `Map` a cada chamada

| Campo | Detalhe |
|-------|---------|
| **Onde** | `apps/web/lib/card-tree/index.ts:56-58` (`getDepth`); consumidor `board-tree-flow.tsx:141-144` |
| **Falha** | Cada nó chama `getDepth` **2–3×** (`canAdd`, `wouldExceedMaxDepth`→`getDepth`, `canConnectOut`). Cada call faz `new Map(cards.map(...))` → **O(n²)** no paint. Bench: **65ms @1000**, **245ms @2000**. |
| **Sintoma** | INP/jank ao abrir tree, filtrar, sync topologia; piora linear com N. |
| **Handoff** | Programmer: depth index O(n) uma vez; Debugger: profile `TreeCardFlowNode` render. |

### P0 — Kanban: lista sem virtualização + `countChildrenProgress` O(n) por card

| Campo | Detalhe |
|-------|---------|
| **Onde** | `kanban-column.tsx:79-82`; `card-tree/index.ts:212-223`; swimlanes `board-kanban-view.tsx:303-304` |
| **Falha** | Toda coluna faz `.map` em **todos** os `cardIds`. Progresso = scan full `allCards` por tile → **O(n²)** por paint. Sem `memo`/virtualização. Bench: progress+alloc **~19ms @2000** só CPU puro; React+DnD multiplica. |
| **Sintoma** | Scroll vertical engasga; dragOver reclacula progresso de todos os tiles. |
| **Handoff** | Manager: epic “Kanban virtualization”; Programmer: index filhos + windowing; Debugger: React Profiler commit duration. |

### P1 — DnD: `handleDragOver` → `setItems` a cada pointer move

| Campo | Detalhe |
|-------|---------|
| **Onde** | `board-kanban-view.tsx:231-244`, `applyDragToItems`/`findContainer` **:91-94** |
| **Falha** | `findContainer` = `columns.find` + `includes` (O(C·len)). Cada over bem-sucedido dispara re-render de **todas** as colunas/cards. |
| **Sintoma** | Arrastar card em board grande = main-thread spike contínuo. |
| **Handoff** | Programmer: mapa `cardId→columnId` O(1); throttle/`itemsRef` sem setState se container inalterado. |

### P1 — Tree: cada node.data carrega `allCards` completo

| Campo | Detalhe |
|-------|---------|
| **Onde** | `board-tree-flow.tsx:443` (`cardsToFlow`); `TreeCardFlowNode` `:132` |
| **Falha** | N referências ao array completo no RF state; qualquer mutação de cards invalida `initial` (`:805-837` deps `allCards`) e reconstrói nós. Memória ≈ O(N) × payload card. |
| **Sintoma** | GC pauses; syncGraph caro; filter highlight remonta data. |
| **Handoff** | Programmer: passar index/maps estáveis ou selectors; não clonar `allCards` em cada `data`. |

### P1 — Board loader: 2ª wave `.in("card_id", cardIds)` sem chunk

| Campo | Detalhe |
|-------|---------|
| **Onde** | `board-cache.ts:143-171` (`card_tags`, `card_checklist_items`, `card_tree_edges`) |
| **Falha** | PostgREST/URL ou payload explode com milhares de UUIDs; latência TTFB board (budget **<800ms**). Arquitetura 2-wave está alinhada ao budget doc; falta **chunking**. |
| **Sintoma** | Timeout/5xx ou p95 board estoura sob N grande. |
| **Handoff** | Programmer: `.in` em batches (ex. 100–200); Debugger: log tamanho `cardIds` + timing waves. |

### P2 — Realtime invalidate agressivo + Presence track

| Campo | Detalhe |
|-------|---------|
| **Onde** | `use-board-cards-realtime.ts:24-28` (debounce 75ms); `use-board-presence.ts:47-59` (mousemove ≥100ms) |
| **Falha** | Multi-user: invalidate Query → refetch snapshot → recompute Kanban/Tree. Presence `setOthers` em sync frequente. `createClient()` no corpo do hook (`:18`, `:23`) — depende do singleton SSR; se `isSingleton:false` em outro call site, risco de canais duplicados. |
| **Sintoma** | Fanout: um edit → N clients re-render full board. |
| **Handoff** | Programmer: debounce invalidate ≥150–300ms sob burst; Presence throttle cursor; Manager: budget multiplayer. |

### P2 — `filterTreeHighlight` + `collectAncestorIds` O(matches·n)

| Campo | Detalhe |
|-------|---------|
| **Onde** | `card-tree/index.ts:184-198`, `collectAncestorIds:161` (Map por call) |
| **Falha** | Filtro ativo reconstrói Map por ancestral walk. |
| **Sintoma** | Digitar filtro em tree grande = jank. |
| **Handoff** | Programmer: parent index compartilhado. |

### P2 — Swimlanes: `lanes.find` por card

| Campo | Detalhe |
|-------|---------|
| **Onde** | `board-view.tsx:250-253` |
| **Falha** | O(members) por card; + render flat sem DnD virtualizado (`board-kanban-view.tsx:297-325`). |
| **Handoff** | Map `assigneeId→lane`. |

### P3 — Shell / viewport

| Campo | Detalhe |
|-------|---------|
| **Onde** | `app-shell-streaming.tsx:73-88` (`h-dvh` + `main` scroll); `board-view.tsx:283-290` (`fillViewport` **só kanban**) |
| **Falha** | Tree/timeline não usam o mesmo fill — scroll aninhado pode forçar layout thrash; não é O(n²), mas agrava jank visual. |
| **Handoff** | Alinhar `fillViewport` para tree **sem** mudar chrome (Zero-Breakage layout). |

### Já mitigado (não regredir)

- Tree chunk `dynamic(..., { ssr: false })` — `board-view.tsx:28-34`
- `onlyRenderVisibleElements` — `board-tree-flow.tsx:1193`
- Soft warn >300 — `:545-548`
- Debounce invalidate tree / pos — budget req #13
- Board cache `userId+boardId` — `board-cache.ts:255-265`

---

## 4. Mitigações propostas (ranked)

Ordem: **maior ganho / menor risco de quebra E2E**.

| Rank | Mitigação | Alvo | Esforço | Zero-Breakage |
|------|-----------|------|---------|---------------|
| **M1** | Index O(n) de filhos → `Map<parentId, {done,total}>`; usar no Kanban tile + Tree node | P0 Kanban progress / Tree progress | S | **Seguro** — mesma regra `getTreeParents` + `completed_at` |
| **M2** | Index O(n) de depth (ou depth cache no card) + 1× lookup em `TreeCardFlowNode` | P0 getDepth | S | **Seguro** — mesma MAX_DEPTH=8 |
| **M3** | `cardId→columnId` Map; `handleDragOver` só `setItems` se container/index mudou | P1 DnD | S | **Seguro** — mesma `positionBetween` no end |
| **M4** | Não passar `allCards` inteiro em `node.data`; refs/context + maps | P1 Tree memory | M | **Seguro** se guards usarem mesma SoT Query |
| **M5** | Virtualizar lista da coluna (`@tanstack/react-virtual` ou equivalente) mantendo `SortableContext` items = ids completos | P0 DOM | L | **Cuidado** — DnD+virtualização é frágil; E2E `board-kanban-dnd.spec.ts` gate obrigatório |
| **M6** | Chunk `.in("card_id", …)` no loader (100–200 ids) | P1 I/O | M | **Seguro** se merge determinístico |
| **M7** | Debounce realtime invalidate 150–300ms sob burst; Presence cursor 200ms+ | P2 fanout | S | **Seguro** — UX levemente mais “eventual” |
| **M8** | `fillViewport` para tree (mesmo flex chain do kanban) | P3 layout | S | **Visual** — validar overflow/pan RF; não mudar padding shell |
| **M9** | `React.memo` em `SortableCardTile` / `KanbanColumn` com comparadores estáveis | P0/P1 | S | **Seguro** se callbacks estáveis (`useCallback` já em select) |

**Não fazer (MVP / Zero-Breakage):**

- Remover `onlyRenderVisibleElements` ou soft warn.
- RPC `get_board_snapshot` (fast-follow no budget).
- Truncar cards no cliente “por performance” (mutila dados).
- Trocar `dnd-kit` / layout visual das colunas.

---

## 5. Riscos / Zero-Breakage notes

1. **Virtualização Kanban (M5)** é a única mitigação com risco real de regressão DnD — exigir E2E verde + teste manual multi-coluna.
2. **Index de progresso/depth (M1/M2)** deve usar a **mesma** semântica `treeParentIds ∪ parent_id` (`getTreeParents`) — divergência = badge/depth errados.
3. **Chunk loader (M6)** não pode dropar tags/checklist/edges; preferir Promise.all de batches + merge.
4. **Medição oficial** só em **prod build** (`next build && next start`); números de `next dev` (4s) **não** fecham aceite do budget.
5. **Stress auth** depende de Playwright browsers locais; script HTTP já existe — não reinventar.
6. **Tenant:** nenhum script deste dossiê escreve em DB; `ui-render-stress-bench.mjs` é 100% sintético.

---

## 6. Handoff checklist

| Papel | Ação |
|-------|------|
| **Manager** | Priorizar M1→M3 no sprint; M5 como epic separado com gate E2E; re-baseline `perf-stress` em prod após M6. |
| **Programmer** | Implementar M1–M4 sem mudar UI; specs já cobertas por `performance-budgets.md` + `board-tree-view.md`. |
| **Debugger** | Profiler: (1) `TreeCardFlowNode` getDepth, (2) Kanban commit during dragOver, (3) network size 2ª wave board-cache. |

### Aceite sugerido (pós-mitigação)

- [ ] Bench: `getDepth2x@1000` < 16ms; `progressNaive` path indexado @2000 < 2ms
- [ ] E2E `board-kanban-dnd.spec.ts` verde
- [ ] Tree: 10 reparents sem RSC storm (já no budget)
- [ ] `perf-stress` prod: board p95 < 800ms

---

## 7. Apêndice — mapa rápido

```
Shell h-dvh
  └─ main overflow-y-auto
       └─ BoardView fillViewport(kanban)
            ├─ BoardKanbanView ── DndContext ── KanbanColumn[].map(ALL cards)
            │     └─ countChildrenProgress(allCards) × N     ← P0
            └─ BoardTreeView (dynamic)
                  └─ ReactFlow onlyRenderVisibleElements
                        └─ TreeCardFlowNode: getDepth×3 + progress ← P0
```
