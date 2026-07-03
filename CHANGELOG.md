# Changelog

## 2026-07-03 — Departamentos (subdivisoes org)

### Added
- Migration `20260703090000_departments`: `departments`, `department_members`, `boards.department_id`, RLS isolamento estrito, RPCs CRUD
- pgTAP `31_departments_rls_test.sql` (10 testes)
- Aba Departamentos em Organizacoes (`DepartmentsPanel`, membros, icon/cor)
- Home: subgrupos por departamento + filtro + colapsar; grupo Geral
- Criar projeto com select de departamento; mover dept em configuracoes do projeto
- Spec `docs/50-components/departments.md`; E2E `departments.spec.ts`

## 2026-07-03 — Kanban: dedupe cards, delete cascata, DnD colunas

### Fixed
- Duplicacao ao criar card: guard de reentrada em `CreateCardForm` + dedupe por id no loader do board
- Footer do drawer (Salvar/Excluir) fixo fora do scroll

### Added
- Drag-and-drop entre colunas (`@dnd-kit`, `moveCard` server action, fractional indexing)
- Confirmacao de delete com contagem de subtarefas e dependencias (`getCardDeleteImpact`)
- Specs: `board-kanban-dnd.md`, fluxos kanban atualizados
- E2E: dedupe ao criar, delete com confirmacao, drag entre colunas

## 2026-07-02 — Menu Organizacoes + Multi-org + Fix Owner

### Fixed
- Owner da org pode gerenciar participantes de boards (`isOrgAdminRole` no app layer)

### Added
- Cookie de org ativa `ngp:active-org` (ADR-0007)
- Rota `/settings/organizations` com busca, criar org, engrenagem, mover projeto
- Item "Organizacoes" na sidebar
- RPC `move_board_to_org` + pgTAP test 25
- E2E: org-switcher, org-move-board, organizations-menu

### Changed
- Home, Calendario e criar projeto respeitam org ativa
- Settings org singular usa org ativa do cookie
