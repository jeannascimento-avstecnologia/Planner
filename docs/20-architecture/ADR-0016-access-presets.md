# ADR-0016: Presets de acesso (permission codes)

- Status: Aceito
- Data: 2026-07-17
- Relacionado: ADR-0015, plano `hierarquia_acl_unificada`

## Contexto

Papéis fixos (MVP) cobrem o caso comum, mas empresas precisam de pacotes custom (ex.: “Operação comercial” = ver + editar sem ACL). Padrão Asana/Slack/WorkOS: Permissions → Presets → Users.

## Decisão

1. Catálogo fixo de codes: `board.view`, `board.edit_content`, `board.manage_members`, `board.manage_settings`, `org.manage_members`, `org.manage_identity`.
2. Tabelas `access_presets` + `access_preset_permissions`; `board_members.preset_id` (+ dual-write `role` legado).
3. Presets sistema (org_id null, imutáveis): Administrador / Editor / Visualizador.
4. Custom por org: subset do catálogo; teto = codes do Administrador de projeto (não ultrapassa).
5. Quem cria/edita preset = **apenas `owner`** org (`app.can_manage_access_presets`). Org `admin` nao.
6. Quem atribui = `board.manage_members` (Administrador projeto) **ou Proprietário org** (nao org admin).
7. Enforcement: `app.has_board_permission(board, code)` + TS `computeBoardPermissions`.
8. União: maior poder vence (org bypass ∪ membership ∪ dept write para `edit_content`).
9. Audit via `card_events`: `preset_created|updated|deleted|assigned` (scope org/board).
10. Grupos = fast-follow (atalho preset→N usuários).

## Consequências

- UI invite/membros seleciona por **label do preset** (sem expor `admin`/`manager`).
- Migrar convites: `invitations.preset_id` opcional; accept sincroniza role+preset.
- Tipos contracts atualizados; `supabase gen types` na promoção.

## Alternativas rejeitadas

- Permission scheme Jira: rejeitado (complexidade).
- Permission solta no usuário: rejeitado (auditoria frágil).
- Comment-only: rejeitado até capability real.

---

## Addendum 2026-07-17 — Catálogo fino (checklist)

Plano: `checklist_permissoes_preset_0bfbd3df.plan.md`.

### Decisão adicional

1. Catálogo **fino** `board.cards.*`, `board.columns.*`, `board.members.*`, etc. (ver `docs/50-components/access-presets.md`).
2. Aliases legados `board.edit_content` / `board.manage_members` expandem para o conjunto filho (compat seeds/UI antiga).
3. Seeds sistema passam a persistir **codes finos**; leitura resolve alias em `has_board_permission` e TS `expandPermissionAliases`.
4. Enforcement em duas camadas: UI/actions checam code fino; RLS mantém `can_write_board` / `can_manage_board_members` como OR dos codes de conteúdo / membros (via alias), sem explodir policies SQL neste épico.
5. UI: componente único `AccessPresetPermissionChecklist` (grupos, N de M, Selecionar tudo/Limpar no **fim** do grupo, atalhos sistema); reusado em settings e invite.
6. Fora de escopo: grupos de usuários, F.2 field-level, comment-only, `board.delete` no checklist de projeto.

### Consequências

- Ceiling Zod/SQL = codes finos; aliases aceitos na CHECK/leitura para linhas legado.
- `computeBoardPermissions` retorna Set expandido; helpers `hasBoardPermission(code)`.
- Stress/perf: checklist O(n) local sem re-fetch por checkbox; dossiê em `docs/60-quality/`.
