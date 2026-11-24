# Duplicar projeto (`duplicate_board`)

> ACL: [ADR-0015](../20-architecture/ADR-0015-hierarquia-acl-papeis-fixos.md)

## Contexto

Quem criou um projeto (`boards.created_by`) precisa clonar o grafo na mesma org (template vivo) sem copiar membros extras nem segredos (Tiflux/iCal). Privilegio no Postgres, padrao `create_board` — sem Edge Function nova.

## Objetivos

- RPC `public.duplicate_board(p_board_id uuid)` retorna a row do board novo.
- UI: botao **Duplicar projeto** no modal de configuracoes (engrenagem), so para o criador.
- Clone na mesma org / mesmo `department_id`; criador vira Editor no clone.

## Nao-objetivos

- Duplicar para outra organizacao.
- Copiar `board_members` de terceiros, convites, iCal, token Tiflux, `yjs_documents`, historico `card_events` / `automation_runs` / outbox / notificacoes.
- Copiar `card_workload_allocations` e `cards.personal_plan_at`.
- Opt-in de copiar secret Tiflux.

## Requisitos

1. Auth (qualquer falha → `forbidden`): autenticado; origem existe; `created_by = auth.uid()`; mesma regra de criacao que `create_board` (org admin/owner **ou** admin/manager do departamento); `app.can_access_board` na origem.
2. Nome: `{nome} (cópia)`; se colidir na org, `(cópia 2)`, … Truncar para caber em 120 chars.
3. Apos INSERT em `boards`, apagar colunas/estagios seed e copiar o grafo da origem.
4. Copiar (PKs novos + remap): stages, columns (`default_stage_id`), tags, cards (zerar `tiflux_*`; `personal_plan_at` null), `parent_id`, card_tags, dependencias, checklist, tree edges, comentarios (`author_id` historico), anexos URL, `automation_rules` por ultimo (remap UUID em JSON), `board_whiteboards.snapshot` remapeado.
5. Nao copiar secrets (`board_integration_secrets`); `tiflux_enabled=false`; `integrations='{}'`; `archived=false`.
6. Durante a copia: `app.audit_skip=1` (nao inundar audit/notificacoes). Automacoes copiadas depois dos cards.
7. Action `duplicateBoard`: Zod, rate limit 20/min, RPC, `notifyProjectCreated`, revalidate home.
8. UI so se `board.created_by === currentUserId`. ConfirmDialog. Sucesso: toast, fecha modal, navega para `/boards/{id}`.

## Criterios de aceite

- [ ] Criador duplica; outro membro (inclusive org admin) nao ve o botao; RPC `forbidden`.
- [ ] Clone na mesma org; exatamente 1 `board_members` (criador/Editor); sem row em `board_integration_secrets`.
- [ ] Cards/colunas/comentarios/anexos/automacoes/whiteboard presentes com IDs novos; `parent_id` remapeado.
- [ ] Cards do clone sem vinculo Tiflux.
- [ ] Nome termina com ` (cópia)` (ou ` (cópia N)`).

## Questoes abertas

Nenhuma (decisoes do plano: criador-only; full minus secrets/membros).

## Specs vinculadas

- [projects-hub.md](../50-components/projects-hub.md)
- [board-sharing.md](board-sharing.md)
- [whiteboard.md](../50-components/whiteboard.md)
- [automations-eca.md](../50-components/automations-eca.md)

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| RPC + ACL | `supabase/migrations/20260910120000_duplicate_board_rpc.sql` | `supabase/tests/51_duplicate_board_test.sql` |
| Contrato | `packages/contracts/src/schemas.ts`, `database.types.ts` | `apps/web/lib/boards/duplicate-board-input.test.ts` |
| Action | `apps/web/app/(app)/boards/actions.ts` | pgTAP + e2e |
| UI | `project-settings-modal.tsx` | `e2e/boards.spec.ts` |
