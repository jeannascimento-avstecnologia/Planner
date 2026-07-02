# Organization Settings

## Rotas

| Rota | Conteudo |
|------|----------|
| `/settings/organization` | Membros (tabela + roles + remover) |
| `/settings/organization/invites` | Convites pendentes + formulario |
| `/settings/organization/settings` | Nome/slug + transferir ownership |

## Permissoes UI

- **Viewer**: redirect para `/boards` (403)
- **Admin/Owner**: full access exceto transfer (so owner)

## Componentes

- `OrgMembersTable` — lista membros, dropdown role, remover
- `OrgInviteForm` — emails batch (padrao `InviteEmailsPanel`)
- `OrgSettingsForm` — nome + slug
- `TransferOwnershipDialog` — select membro + confirmacao dupla

## Navegacao

- Link no `ProfileMenu`: "Organizacao"
- Tabs horizontais no layout de settings

## Criterios de aceite

- [ ] Owner ve botao transferir ownership
- [ ] Admin pode convidar viewer/admin (nao owner via invite)
- [ ] Remover owner bloqueado com mensagem clara
- [ ] Convite org -> signup/login -> membership criada
