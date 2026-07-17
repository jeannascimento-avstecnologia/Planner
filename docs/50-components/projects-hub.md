# Hub de Projetos (`/projects`)

> ADR: [ADR-0015](../20-architecture/ADR-0015-hierarquia-acl-papeis-fixos.md)

## Objetivos

- Aba **Projetos** (`/projects`) como hub de gerenciamento (nao abre kanban ao clicar no tile).
- Selecionar projeto via `?board=<uuid>`; painel de detalhe com participantes e tarefas.
- **Home** (`/boards`): calendario de prazos + cubos; clique no tile abre kanban; engrenagem abre configuracoes.

## Nao-objetivos

- Alterar comportamento de `/boards/[boardId]` (kanban existente).
- Rollup cross-board.
- Calendario de prazos na pagina `/projects`.

## Requisitos

1. `/projects`: click no tile seleciona projeto (URL `?board=`); nao navega.
2. `/projects`: sem `DeadlineTiles`.
3. `/boards` (Home): tile navega para `/boards/[id]`; engrenagem abre `ProjectSettingsModal`.
4. `/boards` (Home): `DeadlineTiles` com prazos dos proximos 7 dias.
5. Aba Participantes com edicao de papeis (Administrador do projeto / org admin|owner).
6. Lista 10 tarefas abertas com `due_date` mais proximo do projeto.
7. CTA **Abrir Projeto** → `/boards/[id]`.
8. **Trocar projeto** limpa selecao.

## Papeis board

| DB | UI | Permissoes |
|----|-----|------------|
| `viewer` | Visualizador | Leitura |
| `admin` | Editor | Editar cards (sem convidar / alterar papeis) |
| `manager` | Administrador | Editar cards + convidar + alterar papeis + settings |

## Criterios de aceite

- [ ] `/projects`: tile selecionado com destaque visual; detalhe visivel.
- [ ] `/projects`: sem secao "Proximos 7 dias".
- [ ] `/boards`: clique no tile navega para kanban.
- [ ] `/boards`: engrenagem abre modal de configuracoes/convite.
- [ ] Administrador do projeto / org admin|owner ve formulario de convite; Editor e Visualizador nao.
- [ ] Abrir Projeto navega para kanban.
- [ ] Tiles grid com altura uniforme.

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Selecao hub | `projects-hub-shell.tsx`, `project-board-tile.tsx` | `e2e/projects-hub.spec.ts` |
| Home direto | `boards/page.tsx`, `hubMode={false}` | `e2e/boards.spec.ts` |
| Participantes | `share-project-panel.tsx` | `e2e/board-permissions.spec.ts` |
| 10 tarefas | `project-hub-detail.tsx` | `e2e/projects-hub.spec.ts` |
