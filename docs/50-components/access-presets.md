# Presets de acesso

> ADR: [ADR-0016](../20-architecture/ADR-0016-access-presets.md) · Pré-req: [ADR-0015](../20-architecture/ADR-0015-hierarquia-acl-papeis-fixos.md)  
> Plano: `checklist_permissoes_preset_0bfbd3df.plan.md`

## Contexto

Owner precisa criar pacotes de permissão reutilizáveis e atribuí-los a membros de projeto, sem permission solta no usuário. Checklist fino cobre interações do board (cards, colunas, membros, integrações).

## Objetivos

- Catálogo fixo de permission codes (finos + aliases legados).
- Presets sistema imutáveis + custom por org com teto.
- CRUD em `/settings/access-presets` (**só Proprietário**) com checklist agrupado Aurora.
- Invite: "Novo nivel" abre o **mesmo drawer** (sem select Base:).
- Enforcement: UI/actions checam code fino; RLS via `can_write_board` / `can_manage_board_members` derivados (qualquer code de conteúdo / membros).
- Audit `preset_*` em `card_events` com **nome do preset** (e pessoa/projeto em `preset_assigned`); ver [audit-log.md](./audit-log.md).

## Não-objetivos

- Grupos de usuários — fast-follow.
- Field-level F.2; comment-only; permission schemes Jira.
- Renomear enums DB.
- `board.delete` / `org.*` no checklist de preset de projeto.

## Requisitos

### Catálogo fino (checklist)

| Grupo | Code | Label UI |
|-------|------|----------|
| Visualizacao | `board.view` | Ver projeto, cards e views |
| Cards | `board.cards.create` | Criar cards |
| | `board.cards.edit` | Editar campos do card |
| | `board.cards.move` | Mover cards (Kanban/DnD) |
| | `board.cards.delete` | Excluir cards |
| | `board.cards.change_stage` | Alterar etapa |
| | `board.cards.plan_work` | Planejar horas / workload no card |
| Colunas | `board.columns.create` | Criar colunas |
| | `board.columns.rename` | Renomear colunas |
| | `board.columns.delete` | Excluir colunas |
| Metadados | `board.stages.manage` | Gerenciar etapas |
| | `board.tags.create` | Criar tags |
| | `board.tags.assign` | Associar tags a cards |
| | `board.tags.delete` | Excluir tags |
| | `board.checklist.edit` | Editar checklist |
| | `board.tree.edit` | Editar arvore (ligacoes/nos) |
| Colaboracao | `board.whiteboard.edit` | Editar whiteboard |
| Config | `board.appearance.edit` | Aparencia (icone/cor) |
| | `board.manage_settings` | Configuracoes do projeto (nome, arquivo, dept) |
| | `board.automations.manage` | Automacoes |
| | `board.tiflux.use` | Usar Tiflux (criar/vincular) |
| | `board.tiflux.configure` | Configurar token Tiflux |
| Membros | `board.members.invite` | Convidar integrantes |
| | `board.members.update` | Alterar nivel de membros |
| | `board.members.remove` | Remover membros |

Custom presets: apenas codes `board.*` ⊆ ceiling Administrador (lista acima). Org-only fora do checklist: `org.manage_members`, `org.manage_identity`.

### Aliases legados (compat)

| Alias | Expande para |
|-------|----------------|
| `board.edit_content` | cards.* + columns.* + stages + tags.create/assign + checklist + tree + whiteboard + appearance + tiflux.use + automations |
| `board.manage_members` | members.invite + update + remove |

- Seeds sistema gravam **codes finos**.
- Leitura / `has_board_permission` / `expandPermissionAliases` ainda aceitam legado.
- Implies: qualquer code de escrita implica `board.view`; `members.*` implica `board.view`.

### Schema

- `access_presets` + `access_preset_permissions` (inalterado estruturalmente)
- `board_members.preset_id` / `invitations.preset_id`
- `app.has_board_permission(p_board, p_code)` com resolução de alias
- `app.can_write_board` ≈ qualquer code de conteúdo (via alias `edit_content`)
- `app.can_manage_board_members` ≈ qualquer `members.*` (via alias `manage_members`)
- Trigger ceiling: só codes do catálogo fino (+ aliases legados na CHECK para linhas antigas)

### Seeds sistema

| system_key | Label | base_role | Codes |
|------------|-------|-----------|-------|
| `board_admin` | Administrador | manager | todos os codes do ceiling |
| `board_editor` | Editor | admin | view + codes de conteúdo (sem members.*, sem tiflux.configure, sem manage_settings) |
| `board_viewer` | Visualizador | viewer | `board.view` |

### Contratos TS

| Peça | Entrada | Saída |
|------|---------|--------|
| `listAccessPresets(orgId)` | org | presets + permissions[] + usersUsing |
| `createAccessPreset` | `{ orgId, name, description?, permissionCodes[] }` | preset \| erro |
| `updateAccessPreset` | `{ id, name?, description?, permissionCodes? }` | rejeita is_system |
| `deleteAccessPreset` | id | ok se zero assignments |
| `assignBoardMemberPreset` | `{ boardId, userId, presetId }` | exige members.* / manage_members |

### UI

- Componente único `AccessPresetPermissionChecklist`: grupos, `N de M`, **Selecionar tudo / Limpar ao fim** de cada grupo, atalhos Visualizador/Editor/Administrador.
- `/settings/access-presets`: drawer Aurora `max-w-lg`, footer sticky.
- Excluir custom: modal tipar `excluir` (botão desabilitado até match); bloqueia se `usersUsing > 0`.
- Invite: remove select "Base:"; "Novo nivel" abre o mesmo drawer; pós-salvar seleciona no select.
- **Lista de membros (Share/Access)**: label = `presetName` do catálogo (custom visível, não só "Editor"); select = presets org+sistema; assign via `assignBoardMemberPreset` (dual-write role no DB).
- Tokens Aurora; sem cards decorativos.

### Segurança

- Ceiling CHECK/trigger; so **owner** cria/edita (nao org admin).
- Assign exige `board.members.*` / alias manage_members; IDOR `preset.org_id = board.org_id OR is_system`.
- UI nao e SoT; Zod + RLS validam.
- Audit `preset_*`; XSS: Zod max + React escape.
- Criticas/Altas de escalation/IDOR: bloqueiam merge sem pgTAP + teste cross-org.

## Criterios de aceite

- [ ] Seeds sistema com codes finos; custom so **owner**.
- [ ] Org admin nao cria/edita/exclui preset (RLS + actions).
- [ ] Custom com code fora do teto rejeitado.
- [ ] Checklist: select-all/Limpar no fim do grupo; atalhos sistema.
- [ ] Invite abre drawer (nao form Base:) **somente owner**.
- [ ] Excluir preset exige digitar `excluir` no modal de confirmacao.
- [ ] Lista de membros mostra **nome do preset** custom (nao so label legado Editor/Admin).
- [ ] Gates UI usam codes finos; `canWriteBoard` / manage members = OR compat.
- [ ] Org A nao ve/edita presets de org B.
- [ ] Vitest aliases/implies/select-all + E2E smoke; pgTAP quando Supabase local OK.

## Matriz Spec → Codigo → Teste

| Spec | Codigo | Teste |
|------|--------|-------|
| Schema/RLS/alias | `20260717160000_access_preset_fine_codes.sql` | `46` + `47_access_presets_fine_codes_test.sql` |
| Catalog/aliases | `schemas.ts`, `access-presets.ts` | Vitest |
| Authz | `board-authz.ts`, loader | Vitest |
| Checklist UI | `access-preset-permission-checklist.tsx` | E2E testids |
| Settings/invite/membros | manager + invite panel + `BoardMembersList` | E2E smoke + label preset |
| Perf | memo expand; sem refresh no checkbox | dossiê `docs/60-quality/` |
