# E.2 — Export Microsoft Teams (Graph API)

> Depende de: [workload-daily-planning.md](./workload-daily-planning.md).  
> ADR: [ADR-0012](../20-architecture/ADR-0012-microsoft-graph-teams-export.md).

## Objetivos

- Org admin configura Team/Channel/Plan/Bucket (`org_teams_integrations`).
- Usuário conecta conta Microsoft (OAuth delegated, tokens server-side).
- Export one-way: plano 15d → Planner tasks (`POST /planner/tasks`).
- Re-export idempotente via `teams_export_mappings`.

## Não-objetivos

- Sync bidirecional Planner ↔ cards.
- Premium Planner via API (não exposto Microsoft Graph v1).
- Modo Outlook blocks — fast-follow.

## Permissões Graph

- `Tasks.ReadWrite`, `Group.Read.All`, `User.Read`
- Tokens: Edge Function + coluna criptografada; nunca cliente.

## Critérios de aceite

- [ ] Admin configura integração uma vez.
- [ ] Export cria tasks no Planner do canal.
- [ ] Re-export atualiza task existente.
- [ ] Tokens nunca no cliente/logs.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Config org | `org_teams_integrations` | pgTAP |
| OAuth tokens | `user_microsoft_tokens` + EF callback | Security audit |
| Export | `export-plan-to-teams` EF | E2E mock |
