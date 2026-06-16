# Board appearance — icon + color + tema escopado

## Contexto
Projetos ficam mais identificaveis com icone e cor proprios na home e no header. A cor escolhida tambem deriva um **tema visual escopado** na rota do kanban (`/boards/[boardId]`).

## Requisitos
- `boards.icon` (text, nullable) — nome de um icone Lucide curado (ver `apps/web/lib/icon-catalog.ts`).
- `boards.color` (text, nullable) — hex `#RRGGBB`; default visual quando nulo = accent do tema global Aurora.
- Editar aparencia: org admin OU board admin (`app.can_write_board`).
- Criar/excluir projeto: somente org admin (`app.has_org_role(admin)`).

## Tema escopado por board
- `BoardThemeScope` aplica CSS vars (`--board-accent`, `--board-bg`, etc.) apenas na area do projeto.
- Derivados: accent 100%, muted ~20%, bg ~6% (light) / ~8% (dark), surface ~10–12%, border ~12–15%.
- Componentes do kanban usam tokens `board-*` (`bg-board-accent`, `bg-board-surface`, …).
- **Fora do escopo:** sidebar, notificacoes, perfil, calendario, home `/boards` (formulario de criar projeto mantem tema global).
- **Semanticos globais preservados:** prioridade (`aurora-danger/warning/info`), cards atrasados.

## RLS (migration 0005)
- Substitui policy unica `boards_write` por `boards_insert` (admin org), `boards_update` (`can_write_board`), `boards_delete` (admin org).

## Criterios de aceite
- Viewer nao altera aparencia (pgTAP).
- Board admin altera icone/cor sem ser admin da org.
- Home renderiza icone + tint da cor por projeto.
- Mudar cor atualiza botões e fundo do kanban; sidebar inalterada.
- Funciona em tema claro e escuro.

## Matriz Spec -> Codigo -> Teste
- `supabase/migrations/0005_board_appearance.sql`
- `apps/web/lib/board-theme.ts`, `components/board/board-theme-scope.tsx`
- `apps/web/lib/icon-catalog.ts`, `components/ui/icon-picker.tsx`, `components/ui/color-picker.tsx`, `components/board/board-icon.tsx`
- `apps/web/app/(app)/boards/actions.ts` (`createBoard`, `updateBoardAppearance`)
- `supabase/tests/01_features_rls_test.sql`
- E2E: `apps/web/e2e/ux-refinements.spec.ts` (board-theme-scope)
