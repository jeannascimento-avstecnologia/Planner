# Menu Organizacoes

## Rota

| Rota | Conteudo |
|------|----------|
| `/settings/organizations` | Hub multi-org: busca, projetos por org, engrenagem, criar org |

Sidebar: icone `Building2`, label "Organizacoes".

## Layout

1. Header + botao "Criar organizacao"
2. Barra de busca (filtra projetos; mantem agrupamento por org)
3. Cards por org: nome, badge role, badge "Ativa", engrenagem, "Tornar ativa"
4. Lista de projetos acessiveis na org (link para board)
5. Owner/admin: botao "Mover" por projeto

## Modal engrenagem (`OrgQuickManageModal`)

Abas: **Identidade** (logo) | **Membros** | **Convites** | **Avancado** (transferir ownership / excluir org / sair) — reusa `OrgMembersTable`, `OrgInviteForm`, `TransferOwnershipDialog`, `DeleteOrganizationSection`.

## Dialogs

- `CreateOrganizationDialog` — nome + slug, RPC `create_organization`, define org ativa
- `MoveProjectDialog` — select org destino, dupla confirmacao, RPC `move_board_to_org`

## Permissoes UI

| Acao | Quem |
|------|------|
| Ver orgs | qualquer membro |
| Engrenagem / convites | owner/admin |
| Mover projeto | owner/admin em origem **e** destino |
| Criar org | qualquer autenticado |
| Tornar ativa | membro da org |

## Pos-exclusao de organizacao

- Owner exclui org ativa: cookie `ngp:active-org` limpo; se restam memberships, cookie aponta para a proxima org e UI vai para `/settings/organizations`.
- Se **nenhuma** org resta: autenticado permanece logado; redirect para `/boards` (empty state criar org). **Proibido** tratar "sem org" como `redirect("/login")` no layout de settings.

## Criterios de aceite

- [ ] Busca filtra projetos preservando headers de org
- [ ] Org ativa reflete em Home e Calendario
- [ ] Owner convida em board settings sem erro de permissao
- [ ] Mover projeto atualiza org_id em cascata (pgTAP)
- [ ] Excluir ultima org → `/boards` (criar org), sem ir para login
- [ ] Excluir org com outras restantes → hub `/settings/organizations` com org ativa valida
