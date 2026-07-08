#!/usr/bin/env node
/**
 * Red Team perf stress — HTTP load contra rotas criticas (dev local).
 * Uso: node scripts/perf-stress.mjs [--base http://localhost:3001] [--concurrency 25] [--requests 150]
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(join(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("--base", "http://localhost:3001");
const CONCURRENCY = Number(arg("--concurrency", "25"));
const REQUESTS_PER_ROUTE = Number(arg("--requests", "150"));
const SEED_BOARD = "33333333-3333-3333-3333-333333333333";

const ROUTES = [
  { name: "login", path: "/login", auth: false },
  { name: "boards_home", path: "/boards", auth: true },
  { name: "board_kanban", path: `/boards/${SEED_BOARD}`, auth: true },
  { name: "board_timeline", path: `/boards/${SEED_BOARD}?view=timeline`, auth: true },
  { name: "calendar", path: "/calendar", auth: true },
  { name: "plan", path: "/plan", auth: true },
  { name: "workload", path: "/workload", auth: true },
  { name: "projects", path: "/projects", auth: true },
  { name: "org_settings", path: "/settings/organizations", auth: true },
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function summarize(name, times, errors) {
  const sorted = [...times].sort((a, b) => a - b);
  const total = times.length + errors.length;
  const ok = times.length;
  return {
    route: name,
    total,
    ok,
    errors: errors.length,
    errorRate: total ? ((errors.length / total) * 100).toFixed(1) + "%" : "0%",
    min: sorted[0]?.toFixed(0) ?? "-",
    p50: percentile(sorted, 50).toFixed(0),
    p95: percentile(sorted, 95).toFixed(0),
    p99: percentile(sorted, 99).toFixed(0),
    max: sorted[sorted.length - 1]?.toFixed(0) ?? "-",
    avg: sorted.length ? (sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(0) : "-",
    rps: "-",
  };
}

async function acquireAuthCookies() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("admin@nextgen.dev");
  await page.getByLabel("Senha").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/boards/, { timeout: 20_000 });
  const cookies = await context.cookies();
  await browser.close();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function hammerRoute(route, cookieHeader) {
  const url = `${BASE}${route.path}`;
  const times = [];
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= REQUESTS_PER_ROUTE) break;
      const headers = route.auth && cookieHeader ? { Cookie: cookieHeader } : {};
      const t0 = performance.now();
      try {
        const res = await fetch(url, { headers, redirect: "manual" });
        const ms = performance.now() - t0;
        if (res.status >= 500) {
          errors.push({ status: res.status, ms });
        } else if (route.auth && (res.status === 302 || res.status === 307)) {
          const loc = res.headers.get("location") ?? "";
          if (loc.includes("/login")) errors.push({ status: res.status, ms, auth: true });
          else times.push(ms);
        } else {
          times.push(ms);
        }
      } catch (e) {
        errors.push({ error: String(e), ms: performance.now() - t0 });
      }
    }
  }

  const wallStart = performance.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const wallMs = performance.now() - wallStart;
  const summary = summarize(route.name, times, errors);
  summary.rps = wallMs > 0 ? (summary.ok / (wallMs / 1000)).toFixed(1) : "0";
  return summary;
}

async function healthCheck() {
  const res = await fetch(`${BASE}/login`, { redirect: "manual" });
  if (!res.ok && res.status !== 200) throw new Error(`Servidor indisponivel: ${BASE} status=${res.status}`);
}

async function main() {
  console.log("=== Red Team Perf Stress ===");
  console.log(`Base: ${BASE} | concurrency: ${CONCURRENCY} | requests/route: ${REQUESTS_PER_ROUTE}`);
  console.log("");

  await healthCheck();
  console.log(">> Autenticando via Playwright (admin@nextgen.dev)...");
  const cookieHeader = await acquireAuthCookies();
  console.log(">> Sessao OK. Iniciando carga...\n");

  const results = [];
  for (const route of ROUTES) {
    process.stdout.write(`  ${route.name}... `);
    const r = await hammerRoute(route, cookieHeader);
    results.push(r);
    console.log(`p95=${r.p95}ms errors=${r.errors}`);
  }

  console.log("\n=== Resultados ===\n");
  console.table(results);

  const hotspots = results.filter((r) => Number(r.p95) > 600 || r.errors > 0);
  console.log("\n=== Dossie de Gargalos ===\n");
  if (!hotspots.length) {
    console.log("Nenhum gargalo critico (p95 > 600ms ou erros) neste cenario.");
  } else {
    for (const h of hotspots) {
      console.log(`- ${h.route}: p95=${h.p95}ms p99=${h.p99}ms errors=${h.errors} (${h.errorRate})`);
    }
  }

  const targets = [
    { route: "boards_home", maxP95: 600 },
    { route: "board_kanban", maxP95: 800 },
    { route: "plan", maxP95: 900 },
    { route: "workload", maxP95: 900 },
  ];
  console.log("\n=== Metas do plano ===\n");
  for (const t of targets) {
    const r = results.find((x) => x.route === t.route);
    const pass = r && Number(r.p95) <= t.maxP95 && r.errors === 0;
    console.log(`${pass ? "PASS" : "FAIL"} ${t.route}: p95=${r?.p95 ?? "-"}ms (meta <${t.maxP95}ms)`);
  }

  const anyFail = results.some((r) => r.errors > 0 || Number(r.p95) > 800);
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error("Stress test falhou:", e.message);
  process.exit(2);
});
