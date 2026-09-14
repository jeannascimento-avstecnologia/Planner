# Debug Report (“Reportar problema”)

> **Gate SDD:** implementação após esta spec.  
> Plano: [fase2-epicos-comerciais.md](../../.cursor/plans/fase2-epicos-comerciais.md) (ferramenta de suporte, paralelo aos épicos).  
> Paridade UX: AVS Career (`DebugReportProvider` / sidebar `Bug` / e-mail).

## Contexto

Usuários autenticados precisam enviar um relatório de bug com captura de tela e log de sessão, sem abrir ticket no banco. O destino é e-mail para destinatários de ops (`DEBUG_REPORT_RECIPIENTS`). O Planner não tem `core-api`: o envio usa Route Handler Next.js + Resend (mesmo caminho dos convites).

## Objetivos

- Botão **Reportar problema** no rodapé da sidebar (ícone `Bug`) + atalho Ctrl/Cmd+Shift+D.
- Captura automática do viewport + snapshot de até 200 eventos de sessão.
- Modal para revisar captura/logs, preencher título/descrição/notas e enviar.
- E-mail HTML + anexos `screenshot.png` e `session-log.json`.
- Autenticação obrigatória; rate limit 5/hora/usuário; redação de segredos no cliente e no servidor.

## Não-objetivos

- Tabela de tickets, migration, RLS ou pgTAP deste fluxo.
- Edge Function dedicada (e-mail já é Next.js + Resend).
- Criar/editar dependências, filtros ou Timeline.
- Instalar `react-hook-form` só para este modal.

## Requisitos

- **DR-001 UI:** botão no footer da sidebar, acima de Ajuda. Recolhida: ícone + `sr-only`. `aria-label="Reportar problema"`. Enquanto captura: “Capturando...” + disabled.
- **DR-002 Atalho:** Ctrl+Shift+D / Cmd+Shift+D no layout autenticado.
- **DR-003 Coletor:** buffer FIFO 200; navigation, click, console.error/warn, error, unhandledrejection, api.error. Não registra clique em password/campos sensíveis. Redige Bearer e padrões `password|secret|api_key`.
- **DR-004 Fetch patch:** logar `!ok` em `/api/` e host Supabase; excluir `/debug-reports`.
- **DR-005 Envio:** `POST /api/debug-reports` autenticado. `userId`/e-mail do reporter só da sessão. Recipients só de `DEBUG_REPORT_RECIPIENTS`. Screenshot ≤ 4MB (string). Rate limit Upstash 5/h (`ratelimit:user:{id}:debug-report`).
- **DR-006 E-mail:** `replyTo` = e-mail do usuário; anexos PNG + JSON; HTML com URL, viewport, org, UA, logs coloridos por tipo.
- **DR-007 Segredo:** `DEBUG_REPORT_RECIPIENTS` e Resend nunca `NEXT_PUBLIC_*`.

## Critérios de aceite

- [ ] Sidebar autenticada mostra o botão; clique abre modal com preview (ou toast de falha de captura).
- [ ] Atalho abre o mesmo fluxo.
- [ ] Enviar exige screenshot; Cancelar fecha sem POST.
- [ ] POST autenticado dispara e-mail para os recipients; 401 sem sessão; 429 após 5/hora; 400 se recipients vazios ou payload inválido.
- [ ] Toast sucesso: “Relatório enviado. Obrigado!”.
- [ ] Playwright intercepta o POST (não chama Resend).
- [ ] `supabase gen types` sem diff.

## Questões abertas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | Destino | Só e-mail (sem tabela) |
| 2 | App id | `planner-web` |
| 3 | Workspace | org ativa (server); cookie no client só como meta |

## Specs vinculadas

- [GUIA_MESTRE.md](../GUIA_MESTRE.md)
- [notifications.md](../40-api/notifications.md) (Resend)
- [environments.md](../70-ops/environments.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| DR-001/002 | `debug-report-sidebar-button.tsx`, `debug-report-provider.tsx`, `app-sidebar.tsx` | Playwright |
| DR-003/004 | `session-log-collector.ts`, `install-api-error-logging.ts` | Vitest collector |
| DR-005/006 | `app/api/debug-reports/route.ts`, `send-debug-report.ts`, `email.ts` | Vitest use-case |
| DR-007 | `env-guard.ts`, `.env.example` | Vitest env-guard |
