# Estrategia de Testes

## Camadas
- Unit/componentes: Vitest (+ Testing Library).
- E2E: Playwright (fluxos: auth, criar board/card, mover card, compartilhar).
- RLS: pgTAP em `supabase/tests/` (isolamento multi-tenant, RBAC, append-only).
- Visual: Storybook + Chromatic (por sprint de UI).
- Performance: budgets (LCP, INP) no CI.

## Gates (Definition of Done)
- lint + typecheck + Vitest verdes.
- Migracoes aplicam limpo em banco zerado.
- pgTAP verde (sem isso, nao mergeia).
- Playwright do fluxo afetado verde.
- `supabase gen types` consistente (sem diff).

## Prioridade
Seguranca (RLS) e performance sao testes de primeira classe, nao opcionais.
