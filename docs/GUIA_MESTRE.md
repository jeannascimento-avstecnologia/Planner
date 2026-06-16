# GUIA MESTRE DE ENGENHARIA - NextGen Planner

> FONTE DE VERDADE. Leitura OBRIGATORIA antes de QUALQUER alteracao ou implementacao.
> Precedencia em caso de conflito: **este guia > plano ativo (`.cursor/plans/`) > preferencia individual**.
> Se a tarefa contrariar este guia ou o plano: **PARE e proponha a atualizacao do documento ANTES de codar.**

---

## 0. Pre-flight obrigatorio (faca SEMPRE, nesta ordem)

1. Ler este `docs/GUIA_MESTRE.md` por completo.
2. Ler o **plano ativo** em `.cursor/plans/` (decisoes travadas, escopo MVP vs fast-follow, riscos).
3. Ler/atualizar a **spec** correspondente em `docs/` (SDD: sem spec aprovada, nao ha codigo).
4. Confirmar impacto em **multi-tenancy (org_id + RLS)** e **segredos (server-side)**.
5. Antes de editar, declarar em 1 linha: `Guia+Plano lidos | spec: <arquivo> | escopo: MVP|fast-follow`.

Se faltar qualquer item acima, resolva-o primeiro. Nao pule etapas.

---

## 1. Metodologia: Spec-Driven Development (SDD)

- Nenhuma linha de codigo sem spec correspondente aprovada. Spec primeiro, codigo depois, teste valida a spec.
- Toda spec segue o template: Contexto, Objetivos/Nao-objetivos, Requisitos, **Criterios de Aceite**, Questoes Abertas, Specs vinculadas, **Matriz Spec -> Codigo -> Teste**.
- Estrutura de documentacao (`docs/`):
  - `00-product/` (PRD, vision, personas, NFR, competitive-voc)
  - `10-ux/` (design-system Aurora, flows, a11y)
  - `20-architecture/` (system-overview C4, ADRs, security, realtime, caching, multitenancy)
  - `30-data/` (ERD, schema, rls-policies, analytics-model, migrations-strategy)
  - `40-api/` (openapi Edge Functions, rpc-contracts, realtime-channels, notifications, ical-feed, webhooks)
  - `50-components/` (specs por componente)
  - `60-quality/` (test-strategy, e2e-scenarios, rls-test-plan pgTAP, performance-budgets)
  - `70-ops/` (ci-cd, environments, observability, runbooks)

### Mapeamento de personas (`.cursor/rules/`)
Searcher (pesquisa) -> Gerente (specs/ADRs) -> Mapper (estrutura/docs) -> Programador (implementa contra a spec) -> Debugger (revisa vs criterios) -> Tester (E2E/UX da spec) -> Mentor (ADR/README/changelog).

---

## 2. Decisoes de arquitetura TRAVADAS (nao reabrir sem ADR)

- **Supabase-first**: Supabase E o back-end (Postgres + Auth + RLS + Realtime). Sem servico/monolito separado no MVP. Logica privilegiada SO em **Edge Functions (Deno)**.
- **Multi-tenant**: shared schema + coluna `org_id` em TODA tabela + **RLS obrigatoria**. `org_ids`/`role` no JWT via **Custom Access Token Hook** (RLS le do token, sem JOIN por linha).
- **Estado (3 camadas)**: TanStack Query (servidor/optimistic) + Supabase Realtime (Kanban) + Yjs/tldraw CRDT (Whiteboard) + Zustand (UI efemera).
- **Ordenacao**: fractional indexing (mover card/coluna = 1 write O(1)). Proibido reindexar a coluna inteira.
- **Estrutura de card**: subtarefas de 1a classe via `cards.parent_id` (status/assignee proprios, != checklist) + dependencias finish-to-start em `card_dependencies`.
- **Comentarios**: SEMPRE no card. NUNCA substituir por "chat" (erro do Planner 2026).
- **Notificacoes**: tabela `notifications` + preferencias por evento/canal; entrega in-app inbox + Web Push (VAPID/Serwist); digest/batch + Do-Not-Disturb no servidor.
- **Calendario + iCal**: calendario nativo de prazos + feed iCal read-only assinado por Edge Function (token por usuario/board).
- **Analytics event-sourced**: `card_events` append-only -> Materialized Views via `pg_cron` -> cache Upstash Redis. O mesmo `card_events` alimenta o audit log (fast-follow).
- **Paridade ambientes**: migracoes versionadas = fonte de verdade. Dev usa **Supabase Cloud** (projeto remoto); web (Next.js) nunca sobe Postgres/Auth localmente. CI usa `supabase start` efemero apenas para pgTAP. Promocao: Supabase Branching por PR -> staging -> prod (`supabase db push`). Ver **ADR-0002**. `supabase gen types` commitado.

---

## 3. Stack fixada e PROIBICOES

**Use**: Next.js 15 / React 19, TypeScript strict, Tailwind v4 + shadcn/ui (Radix), Motion, **dnd-kit**, tldraw, TanStack Query, Zustand, react-hook-form + Zod, Serwist (PWA/Web Push), Tremor/visx, Supabase, Upstash Redis, Cloudinary, Turborepo. Testes: Vitest, Playwright, Storybook/Chromatic, **pgTAP**.

**NUNCA** (proibido):
- `react-beautiful-dnd` (deprecado) -> use `dnd-kit`.
- `any` em TypeScript -> interfaces/Zod explicitos para payloads.
- Segredo de Cloudinary/API no cliente -> upload SEMPRE assinado por Edge Function.
- Tabela sem `org_id`/sem policy RLS.
- Substituir comentarios de card por chat.
- Reindexacao em massa de ordem -> use fractional indexing.
- Agregacao analitica pesada em query OLTP ao vivo -> use MV + cache.

---

## 4. Multi-tenancy e Seguranca (regras duras)

- Toda tabela de dados de tenant: coluna `org_id` + indice + policy RLS de isolamento.
- Boards compartilhados somam checagem em `board_members` (ACL por board) alem do `org_id`.
- Otimizacao de RLS: envolver `auth.uid()` em subselect para habilitar cache de plano; helper `SECURITY DEFINER` para evitar recursao em `memberships`.
- Toda policy RLS tem teste pgTAP no CI. Sem teste = nao mergeia.
- Cloudinary: persistir apenas `public_id` + metadata; entregar com `f_auto,q_auto`.

```sql
-- Padrao de isolamento por tenant (exemplo de referencia)
create policy cards_tenant_isolation on public.cards
for select using (
  org_id in (
    select org_id from public.memberships
    where user_id = (select auth.uid())   -- (select ...) habilita initplan cache
  )
);
```

---

## 5. Padroes de codigo

- **Comunicacao (caveman mode, do `.cursorrules`)**: respostas ultra-concisas, direto a solucao. **Nao reescrever codigo inalterado** (use `// ... codigo mantido ...`).
- **Senso critico**: se existir rota arquiteturalmente superior, PARE e questione antes de seguir.
- **TypeScript**: strict, sem `any`, interfaces explicitas de I/O, programacao funcional no roteamento de dados.
- **Python**: I/O assincrono (`asyncio`/`aiohttp`), tipagem estrita (`typing`).
- **Redis**: TTL obrigatorio em TODA chave; naming hierarquico (`org:{id}:dash:{metrica}`, `board:{id}:presence`, `ratelimit:{userId}:{rota}`).
- **JSON/parse**: sempre camada de validacao (Zod) + retry/erro tratado.

---

## 6. Escopo: MVP vs Fast-follow (NAO antecipar fast-follow)

**MVP (S1-S8)**: Auth/Tenancy; Kanban Core; Colaboracao + subtarefas/dependencias; Anexos + Calendario/iCal; Notificacoes inteligentes; Dashboard por board; Whiteboard; Hardening/Launch.

**Fast-follow (pos-MVP, NAO implementar antes)**: rollup analitico cross-board; audit log + permissao a nivel de campo; motor de automacao/regras (anti-Butler).

Implementar item de fast-follow no MVP = violacao de escopo. Se necessario, proponha mudanca de plano primeiro.

---

## 7. Anti-padroes de produto (licoes Voice of Customer 2026)

- **Performance e feature, nao detalhe**: optimistic UI sub-100ms; orcamento de performance no whiteboard (virtualizacao) para nao repetir o lag de Miro/FigJam.
- **Offline-first real**: PWA com sync confiavel (incumbentes falham nisso).
- **Sem notification overload**: digest/granular/DND por padrao; notificar so o relevante (mencao/atribuicao/prazo).
- **Mobile com paridade total** (incumbentes tratam mobile como 2a classe).
- **Nunca remover/forcar mudanca** em feature que o usuario depende (erro Planner 2026: chat sobre comentarios, remocao de calendario/iCal).

---

## 8. Definition of Done / Gates de CI

Um trabalho so esta pronto quando: spec atualizada; codigo tipado sem `any`; migracoes aplicam limpo em banco zerado; **pgTAP (RLS) verde**; lint + typecheck + Vitest verdes; Playwright E2E do fluxo verde; `supabase gen types` consistente; sem segredo vazado; performance/a11y dentro do budget.

---

## 9. Protocolo de alteracao deste guia / do plano

- Mudanca em decisao travada -> registrar **ADR** em `docs/20-architecture/adr/` e atualizar este guia + plano.
- Mudanca de escopo -> atualizar o plano ativo em `.cursor/plans/` (todos inclusos) antes de codar.
- Este guia e versionado: toda alteracao relevante referencia o ADR correspondente.
