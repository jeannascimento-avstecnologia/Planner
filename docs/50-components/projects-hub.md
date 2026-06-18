# Hub de Projetos (`/boards`)

## Objetivos

- Aba Projetos como hub de gerenciamento (nao abre kanban ao clicar no tile).
- Selecionar projeto via `?board=<uuid>`; calendario superior filtra prazos desse projeto.
- Painel de detalhe: participantes, proximas 10 tarefas, **Abrir Projeto**, **Trocar projeto**.

## Nao-objetivos

- Alterar comportamento de `/boards/[boardId]` (kanban existente).
- Rollup cross-board.

## Requisitos

1. Click no tile seleciona projeto (URL `?board=`); nao navega.
2. `DeadlineTiles` filtra por `board_id` quando projeto selecionado.
3. Aba Participantes com edicao de papeis (Gerente/org admin apenas).
4. Lista 10 tarefas abertas com `due_date` mais proximo do projeto.
5. CTA **Abrir Projeto** → `/boards/[id]`.
6. **Trocar projeto** limpa selecao.

## Papeis board

| DB | UI | Permissoes |
|----|-----|------------|
| `viewer` | Visualizar | Leitura |
| `admin` | Editor | Editar cards |
| `manager` | Gerente | Convidar + alterar papeis |

## Criterios de aceite

- [ ] Tile selecionado com destaque visual; detalhe visivel.
- [ ] Calendario mostra so prazos do projeto selecionado.
- [ ] Gerente/org admin ve formulario de convite; Editor/Visualizar nao.
- [ ] Abrir Projeto navega para kanban.
- [ ] Tiles grid com altura uniforme.

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Selecao hub | `projects-hub-shell.tsx`, `project-board-tile.tsx` | `e2e/projects-hub.spec.ts` |
| Calendario filtrado | `deadline-tiles.tsx` | `e2e/projects-hub.spec.ts` |
| Participantes | `share-project-panel.tsx` | `e2e/board-permissions.spec.ts` |
| 10 tarefas | `project-hub-detail.tsx` | `e2e/projects-hub.spec.ts` |
