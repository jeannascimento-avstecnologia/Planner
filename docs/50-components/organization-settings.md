# Organization Settings

## Rotas

| Rota | Conteudo |
|------|----------|
| `/settings/organization` | Membros (tabela + roles + remover) |
| `/settings/organization/invites` | Convites pendentes + formulario |
| `/settings/organization/settings` | Nome legal, nome de exibição, CNPJ, logo + transferir ownership |

## Permissoes UI

- **Viewer**: redirect para `/boards` (403)
- **Admin/Owner**: full access exceto transfer (so owner)

## Componentes

- `OrgMembersTable` — lista membros, dropdown role, remover
- `OrgInviteForm` — emails batch (padrao `InviteEmailsPanel`)
- `OrgSettingsForm` — nome legal, nome de exibição, CNPJ (máscara `00.000.000/0000-00` + dígitos verificadores). Slug gerado no servidor a partir do nome de exibição.
- `TransferOwnershipDialog` — select membro + confirmacao dupla

## Navegacao

- Link no `ProfileMenu`: "Organizacao"
- Tabs horizontais no layout de settings

## Criterios de aceite

- [ ] Owner ve botao transferir ownership
- [ ] Admin pode convidar viewer/admin (nao owner via invite)
- [ ] Remover owner bloqueado com mensagem clara
- [ ] Convite org -> signup/login -> membership criada
- [ ] CNPJ vazio é válido; 14 dígitos sem checksum ou paste com letras/e-mail rejeitados com erro no campo

## Hub `/settings`

Agentes de IA e Ferramentas Externas **não** aparecem no hub nem na nav até haver persistência. Rotas antigas redirecionam para `/settings`.
