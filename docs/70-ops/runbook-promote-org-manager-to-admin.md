# Runbook: promover Gerente org → Administrador (ACL MVP)

## Quando

Após migration `can_manage_org_members` = `owner|admin`, usuários com papel **Gerente** (`manager`) na org **deixam de** poder:

- Convidar membros da org
- Alterar papéis / remover membros
- Editar capacidade (workload) que usa `canManageOrgMembers`

## Ação

1. Listar Gerentes que ainda precisam de convites:

```sql
select m.org_id, o.name, m.user_id, p.full_name, u.email
from public.memberships m
join public.organizations o on o.id = m.org_id
join auth.users u on u.id = m.user_id
left join public.profiles p on p.id = m.user_id
where m.role = 'manager';
```

2. Owner/Admin promove via UI (Settings → Membros) ou:

```sql
-- substituir UUIDs
select public.update_membership_role('<org_id>', '<user_id>', 'admin');
```

3. Validar: usuário consegue abrir `/settings/organization/invites` e enviar convite.

## Rollback

Se necessário temporariamente: reverter migration de `can_manage_org_members` para `owner|manager` (não preferido — desalinha ADR-0015).
