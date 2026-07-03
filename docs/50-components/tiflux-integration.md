# Integração Tiflux

## Escopo MVP

- Projeto com `tiflux_enabled = true` exibe botões **Criar** e **Associar** em cards sem ticket.
- **Criar:** modal com campos completos → `POST /tickets`.
- **Associar:** modal com Empresa, Mesa, Ticket (+ pai/filho opcionais) → `GET /tickets/{n}` + persistência em `cards.tiflux_*`.
- Badge `#<ticket_number>` após vincular.
- Filtro na barra do board: dropdown pesquisável por tickets vinculados no projeto.
- Token de API **por board**, configurado nas configurações do projeto.

## Fluxos

1. Hub → engrenagem (tile ou painel do projeto) → **Vincular ao Tiflux** → informar código de API (primeira vez).
2. Board → card sem ticket → **Criar** ou **Associar**.
3. Filtros → **Ticket Tiflux** (somente se Tiflux habilitado).

## UX — credencial por projeto

| Estado | UI |
|--------|-----|
| Checkbox OFF | Sem seção de API |
| Checkbox ON + nunca configurado | Input `password` "Código de API" (obrigatório ao salvar) |
| Checkbox ON + já configurado | Texto "API configurada"; **sem** valor do token |
| Desmarcar + salvar | Apaga credencial do board |
| Desmarcar → marcar de novo | Input password vazio (nova credencial obrigatória) |

## Segredos

- Token em `board_integration_secrets.tiflux_api_token_encrypted` (pgcrypto, at-rest).
- Chave de criptografia: `INTEGRATIONS_ENCRYPTION_KEY` (server-only, nunca `NEXT_PUBLIC_*`).
- Leitura do token: somente `service_role` via `app.get_board_tiflux_token`.
- Metadado público: `integrations.tiflux.configured` (boolean, sem segredo).
- Fallback legado: `TIFLUX_API_TOKEN` env se board habilitado sem credencial no DB (remover em fast-follow).

## Critérios de aceite

- Criar e Associar só em projetos Tiflux e cards sem ticket
- Associar valida ticket na API antes de salvar
- Filtro por ticket oculto se Tiflux desabilitado
- Falha de API sem expor token
- Habilitar Tiflux sem token (board nunca configurado) → erro de validação
- Token informado é validado na API Tiflux antes de persistir (401/403 → erro ao usuário)
- Token nunca retornado ao cliente após salvar
- Apenas usuário com `can_write_board` configura ou remove credencial

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Token criptografado por board | `20260703180000_board_tiflux_secrets.sql` | `05_board_tiflux_secrets_test.sql` |
| Set/clear token + flag configured | RPCs `set_board_tiflux_token`, `clear_board_tiflux_token` | pgTAP |
| Status sem segredo | `board_tiflux_status`, `getBoardTifluxStatusAction` | E2E modal |
| Resolver server-side | `lib/tiflux-credentials.ts` | Vitest |
| UI checkbox + password | `project-settings-modal.tsx` | E2E |
| Actions Tiflux usam token do board | `boards/[boardId]/actions.ts` | E2E integração |
