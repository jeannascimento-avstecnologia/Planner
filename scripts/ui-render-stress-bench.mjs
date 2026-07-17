#!/usr/bin/env node
/**
 * Dry-run UI/CPU stress bench — pure Node, zero I/O de tenant, zero HTTP.
 *
 * Simula hot paths do Kanban/Tree (countChildrenProgress, findContainer DnD,
 * softSnap, getDepth-per-node, topologyKey) com N sintético.
 *
 * Uso:
 *   node scripts/ui-render-stress-bench.mjs
 *   node scripts/ui-render-stress-bench.mjs --sizes 100,300,500,1000
 *
 * Não toca DB, secrets, produção ou dados reais.
 */

import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const SIZES = String(arg("--sizes", "50,100,300,500,1000"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

/** Minimal card stub matching getTreeParents shape. */
function synthCards(n, cols = 8) {
  const cards = [];
  for (let i = 0; i < n; i++) {
    const parentIdx = i > 0 && i % 3 === 0 ? i - 1 : i > 0 && i % 7 === 0 ? Math.floor(i / 2) : null;
    cards.push({
      id: `c${i}`,
      column_id: `col${i % cols}`,
      position: String(i).padStart(8, "0"),
      parent_id: parentIdx != null ? `c${parentIdx}` : null,
      treeParentIds: parentIdx != null ? [`c${parentIdx}`] : [],
      completed_at: i % 5 === 0 ? "2026-01-01" : null,
      tree_x: (i % 20) * 280,
      tree_y: Math.floor(i / 20) * 140,
    });
  }
  return cards;
}

function getTreeParents(card) {
  if (card.treeParentIds != null) return card.treeParentIds;
  return card.parent_id ? [card.parent_id] : [];
}

/** Mirror apps/web/lib/card-tree/index.ts countChildrenProgress — O(n) per call. */
function countChildrenProgress(cards, parentId) {
  let done = 0;
  let total = 0;
  for (const c of cards) {
    if (!getTreeParents(c).includes(parentId)) continue;
    total += 1;
    if (c.completed_at) done += 1;
  }
  return { done, total };
}

/** Indexed O(n) build + O(1) lookup — proposed mitigation. */
function buildChildrenProgressIndex(cards) {
  const idx = new Map();
  for (const c of cards) {
    for (const p of getTreeParents(c)) {
      const cur = idx.get(p) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (c.completed_at) cur.done += 1;
      idx.set(p, cur);
    }
  }
  return idx;
}

/** Mirror findContainer in board-kanban-view applyDragToItems — O(cols * cards_in_col). */
function findContainer(columns, items, id) {
  const columnIds = new Set(columns.map((c) => c.id));
  if (columnIds.has(id)) return id;
  return columns.find((col) => items[col.id]?.includes(id))?.id;
}

function softSnapPosition(id, x, y, others, threshold = 28) {
  let nx = x;
  let ny = y;
  for (const o of others) {
    if (o.id === id) continue;
    const dx = nx - o.x;
    const dy = ny - o.y;
    if (Math.abs(dx) < threshold && Math.abs(dy) < 72) {
      nx = o.x + (dx >= 0 ? 280 : -280);
    }
  }
  return { x: nx, y: ny };
}

function getDepth(cards, cardId) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  let depth = 1;
  let cur = byId.get(cardId);
  if (!cur) return 1;
  const seen = new Set();
  while (cur.parent_id && byId.has(cur.parent_id)) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    depth += 1;
    if (depth > 9) break;
    cur = byId.get(cur.parent_id);
  }
  return depth;
}

function bench(label, fn, iters = 1) {
  const t0 = performance.now();
  let last;
  for (let i = 0; i < iters; i++) last = fn();
  const ms = performance.now() - t0;
  return { label, ms: Number(ms.toFixed(2)), iters, last };
}

function runSize(n) {
  const cols = 8;
  const cards = synthCards(n, cols);
  const columns = Array.from({ length: cols }, (_, i) => ({ id: `col${i}` }));
  const items = {};
  for (const col of columns) {
    items[col.id] = cards.filter((c) => c.column_id === col.id).map((c) => c.id);
  }
  const positions = cards.map((c) => ({ id: c.id, x: c.tree_x, y: c.tree_y }));

  const r = {};

  // Kanban paint: progress per visible card (worst: all cards)
  r.progressNaive = bench(`progressNaive@${n}`, () => {
    let sum = 0;
    for (const c of cards) {
      sum += countChildrenProgress(cards, c.id).total;
    }
    return sum;
  });

  r.progressIndexed = bench(`progressIndexed@${n}`, () => {
    const idx = buildChildrenProgressIndex(cards);
    let sum = 0;
    for (const c of cards) sum += (idx.get(c.id)?.total ?? 0);
    return sum;
  });

  // DnD dragOver storm: 60 pointer moves × findContainer×2
  r.dndFindContainer = bench(`dndFindContainer60@${n}`, () => {
    let hits = 0;
    for (let move = 0; move < 60; move++) {
      const activeId = cards[move % n].id;
      const overId = cards[(move * 7) % n].id;
      if (findContainer(columns, items, activeId)) hits++;
      if (findContainer(columns, items, overId)) hits++;
    }
    return hits;
  });

  // Tree: getDepth ×2 per node (canConnectOut + canAddChild path)
  r.getDepthPerNode = bench(`getDepth2x@${n}`, () => {
    let sum = 0;
    for (const c of cards) {
      sum += getDepth(cards, c.id);
      sum += getDepth(cards, c.id);
    }
    return sum;
  });

  // Tree drag stop softSnap: move 10 selected against all others
  r.softSnapMarquee = bench(`softSnap10@${n}`, () => {
    const moving = positions.slice(0, Math.min(10, n));
    const others = positions.slice(10);
    const snapped = [];
    for (const m of moving) {
      snapped.push(softSnapPosition(m.id, m.x + 5, m.y + 5, [...others, ...snapped]));
    }
    return snapped.length;
  });

  // topologyKey build (sort + join) — runs on every cards change
  r.topologyKey = bench(`topologyKey@${n}`, () => {
    return cards
      .map((c) => `${c.id}:${getTreeParents(c).join(",")}`)
      .sort()
      .join("|");
  });

  // DOM-ish: unbounded card tile props — estimate React fiber cost proxy (alloc)
  r.allocTileProps = bench(`allocTileProps@${n}`, () => {
    const tiles = cards.map((c) => ({
      id: c.id,
      progress: countChildrenProgress(cards, c.id),
      columns,
      tags: [],
      profilesById: {},
    }));
    return tiles.length;
  });

  return r;
}

function budgetHint(ms, soft = 16) {
  if (ms > 100) return "CRITICAL (>100ms main-thread)";
  if (ms > soft) return `JANK (>${soft}ms frame)`;
  return "ok";
}

console.log("=== UI Render Stress Bench (synthetic, dry-run) ===\n");
console.log("Budgets UI (proxy): frame 16ms | critical block 100ms");
console.log("Server budgets: ver docs/60-quality/performance-budgets.md\n");

const rows = [];
for (const n of SIZES) {
  const r = runSize(n);
  for (const [k, v] of Object.entries(r)) {
    rows.push({
      n,
      scenario: k,
      ms: v.ms,
      verdict: budgetHint(v.ms),
    });
  }
  console.log(`N=${n}`);
  for (const [k, v] of Object.entries(r)) {
    console.log(`  ${k.padEnd(22)} ${String(v.ms).padStart(8)}ms  ${budgetHint(v.ms)}`);
  }
  console.log("");
}

// Scaling ratio progressNaive 100→1000 (~100x if O(n²))
const p100 = rows.find((r) => r.n === 100 && r.scenario === "progressNaive");
const p1000 = rows.find((r) => r.n === 1000 && r.scenario === "progressNaive");
if (p100 && p1000 && p100.ms > 0) {
  const ratio = (p1000.ms / p100.ms).toFixed(1);
  console.log(`Scaling progressNaive 100→1000: ${ratio}x (ideal O(n²) ≈ 100x; O(n) ≈ 10x)`);
}

const i100 = rows.find((r) => r.n === 100 && r.scenario === "progressIndexed");
const i1000 = rows.find((r) => r.n === 1000 && r.scenario === "progressIndexed");
if (i100 && i1000 && i100.ms > 0) {
  console.log(`Scaling progressIndexed 100→1000: ${(i1000.ms / i100.ms).toFixed(1)}x`);
}

console.log("\n=== Hotspots (ms > 16) ===\n");
const hot = rows.filter((r) => r.ms > 16).sort((a, b) => b.ms - a.ms);
if (!hot.length) console.log("Nenhum hotspot acima de 16ms neste ambiente.");
else for (const h of hot) console.log(`- N=${h.n} ${h.scenario}: ${h.ms}ms (${h.verdict})`);

process.exit(0);
