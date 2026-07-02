# Gestao de organizacao (API / RPC)

## Contexto

Complementa multi-tenancy (`organizations` + `memberships`) com operacoes privilegiadas via RPC `security definer`. UI em `/settings/organization/*`.

## Objetivos

- Listar membros da org com perfil e role
- Atualizar role, remover membro, sair da org
- Transferir ownership (owner -> admin, novo -> owner)
- Editar nome/slug da org
- Convites org-level por email (paralelo a convites de board)

## Nao-objetivos

- Multi-org switcher no header (fast-follow)
- Audit log de mudancas de membership (fast-follow)

## Roles org

| Role | Permissoes |
|------|------------|
| `owner` | Tudo de admin + transferir ownership; nao pode sair sem transferir |
| `admin` | Gerenciar membros, convites org, editar org |
| `viewer` | Leitura (boards conforme ACL) |
| `manager` | Reservado enum; sem uso org-level no MVP |

## RPCs

| RPC | Auth | Descricao |
|-----|------|-----------|
| `list_org_members(p_org uuid)` | membro org | Retorna user_id, full_name, avatar_url, role, created_at |
| `update_membership_role(p_org, p_user, p_role)` | owner/admin | Nao altera owner diretamente |
| `remove_org_member(p_org, p_user)` | owner/admin | Nao remove owner |
| `leave_organization(p_org)` | membro | Owner bloqueado |
| `transfer_org_ownership(p_org, p_new_owner)` | owner | Atomico |
| `update_organization(p_org, p_name, p_slug)` | owner/admin | Slug unico |
| `create_org_invitation(p_org, p_email, p_role)` | owner/admin | Retorna token plaintext |
| `resolve_org_invitation(p_token)` | anon/auth | status pending/accepted/expired/not_found |
| `peek_org_invitation(p_token)` | anon | email para prefill signup |
| `accept_org_invitation(p_token)` | auth | Insere membership; email deve bater |

## Convite org

- Tabela `organization_invitations` (token SHA-256, 7 dias)
- Link: `{APP_URL}/invite/org?token=`
- Aceite: `/invite/org?token=` -> login se necessario -> RPC accept

## Erros RPC (exceptions)

| Codigo | UI |
|--------|-----|
| `not_authenticated` | Faca login |
| `forbidden` | Sem permissao |
| `owner_cannot_leave` | Transfira ownership primeiro |
| `cannot_remove_owner` | Transfira antes |
| `invalid or expired invitation` | Convite invalido |
| `email mismatch` | Entre com email convidado |

## Matriz Spec -> Codigo -> Teste

| Spec | Codigo | Teste |
|------|--------|-------|
| list members | `settings/organization/actions.ts` | pgTAP 20, E2E org-management |
| transfer ownership | RPC + `TransferOwnershipDialog` | pgTAP 21, E2E transfer |
| org invite | RPC + `/invite/org` | pgTAP 23-24, E2E org-invite-flow |
