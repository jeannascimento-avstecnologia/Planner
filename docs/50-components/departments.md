# Departamentos (subdivisoes org)

## Objetivo
Isolar projetos por departamento dentro de uma organizacao, com CRUD de dept (owner), membros (owner/gerente dept) e visibilidade estrita via RLS.

## Modelo
- `departments(org_id, name, icon, color)`
- `department_members(department_id, org_id, user_id, role)` — roles: viewer, admin, manager (sem owner)
- `boards.department_id` nullable — `null` = **Geral** (visivel a todos os membros da org)

## Regras de acesso
| Escopo | Quem ve |
|--------|---------|
| Geral | Todos os membros da org |
| Dept X | Owner org + membros de X (+ criador + board_members) |
| Criar dept | Owner org |
| Membros dept | Owner org ou gerente do dept |
| Criar projeto | Org admin/owner OU gerente/admin do dept alvo |
| Mover projeto | Owner OU gerente+ origem+destino; envolvendo Geral exige `can_write_board` |

## RPCs
- `create_department`, `update_department`, `delete_department`
- `add_department_member`, `set_department_member_role`, `remove_department_member`
- `set_board_department(p_board, p_dept | null)`

## UI
- **Organizacoes:** aba Departamentos em `OrgQuickManageModal`
- **Home:** subgrupos por dept + filtro + colapsar
- **Novo projeto:** select departamento
- **Config projeto:** mover entre dept em `project-settings-modal`

## Testes
- pgTAP: `31_departments_rls_test.sql`
- E2E: `departments.spec.ts`
