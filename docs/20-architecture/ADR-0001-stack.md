# ADR-0001: Stack e estilo de arquitetura

- Status: Aceito
- Data: 2026-06-15

## Contexto
SaaS B2B multi-tenant, mobile-first, com Kanban/Whiteboard colaborativos em tempo real, dashboard analitico e anexos. Restricoes: PostgreSQL local (dev) + Supabase (prod), Cloudinary, SDD.

## Decisao
- Arquitetura Supabase-first: Supabase E o back-end (Postgres + Auth + RLS + Realtime). Sem servico/monolito separado no MVP.
- Logica privilegiada (segredos, webhooks, agregacoes, iCal, digests) em Edge Functions (Deno).
- Frontend Next.js 15 / React 19 (App Router, RSC, Server Actions), PWA mobile-first.
- Estado em 3 camadas: TanStack Query (servidor/optimistic) + Supabase Realtime (Kanban) + Yjs/tldraw CRDT (Whiteboard) + Zustand (UI).
- Monorepo Turborepo (npm workspaces nesta maquina; pnpm onde disponivel).
- Multi-tenant: shared schema + `org_id` + RLS + custom claims no JWT.
- Ordenacao por fractional indexing.
- Cache: Upstash Redis (TTL + naming hierarquico).

## Alternativas consideradas
- Back-end dedicado (NestJS/Express): rejeitado no MVP (latencia, custo, manutencao). Reavaliar sob escala.
- Schema-per-tenant / DB-per-tenant: rejeitado (migracoes complexas). Evoluir p/ particionamento se necessario.
- react-beautiful-dnd: rejeitado (deprecado) -> dnd-kit.

## Consequencias
- RLS vira o controle de seguranca critico -> testes pgTAP obrigatorios.
- Edge Functions sao o unico lugar com service role / secrets.
- Paridade local->prod via migracoes versionadas + Supabase Branching.
