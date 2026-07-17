# Fluxos Kanban (MVP)

1. Criar projeto (board) na lista `/boards`.
2. Abrir projeto → colunas + cards (shell `h-dvh`; colunas content-sized; scroll na lista de cards).
3. Criar card rapido **no rodape de cada coluna** (sob os cards, fora do scroll): titulo, prioridade, prazo opcional. Um submit = um card (sem duplicacao).
4. Clicar card → drawer (editar tudo + tags + responsavel).
5. Excluir card no drawer (footer fixo) com confirmacao de subtarefas/dependencias em cascata.
6. Arrastar card entre colunas (dnd-kit); persiste `column_id` + `position` + evento `moved`.
7. Filtrar por prioridade / marcador / responsavel; toggle agrupar por responsavel (sem DnD entre swimlanes no MVP).
8. Compartilhar → convite por email + link `/invite?token=`.

## Specs vinculadas

- [card-drawer.md](../50-components/card-drawer.md)
- [board-kanban-dnd.md](../50-components/board-kanban-dnd.md)
- [board-view-modes.md](../50-components/board-view-modes.md)
