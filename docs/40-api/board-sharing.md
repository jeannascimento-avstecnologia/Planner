# Compartilhamento de board

## Fluxo de convite

1. Gerente do projeto ou admin da org abre **Convidar um integrante** no board.
2. Adiciona um ou mais emails na lista; cada um com role (`viewer` | `admin` | `manager`).
3. **Enviar convite** grava `invitations` (token SHA-256, validade 7 dias) e dispara email via Resend.
4. Convidado abre `/invite?token=` → se nao autenticado, redireciona para `/login?next=...` → apos login com o **mesmo email** → RPC `accept_board_invitation` → `board_members`. Reabrir o mesmo link apos aceite redireciona ao projeto (`resolve_board_invitation` + `board_members`).

Se `RESEND_API_KEY` nao estiver configurada, o convite e criado no banco e a UI exibe o link para copiar manualmente (sempre, inclusive quando email enviado — fallback operacional).

## Producao

Runbook completo: [production-email-invites.md](../70-ops/production-email-invites.md)

| Ambiente | `RESEND_FROM` tipico |
|----------|----------------------|
| Staging | `Agify <onboarding@resend.dev>` (so email da conta Resend) |
| Producao | `Agify <noreply@seudominio.com>` (dominio verificado) |

### Rate limit

- Batch: max **20 emails** por request (Zod).
- Hora: max **20 convites/hora** por usuario quando `UPSTASH_REDIS_REST_*` configurado.

### Erros de email (UI)

Mensagens seguras — codigos internos em `lib/invite-email-messages.ts`:

| Codigo | Mensagem UI |
|--------|-------------|
| `missing_api_key` | Email nao configurado — copie o link |
| `domain_not_verified` | Dominio nao verificado — copie o link |
| `invalid_from` | Remetente invalido — copie o link |
| `rate_limited` | Limite do provedor — copie o link |
| `unknown` | Falha no envio — copie o link |

## UI

| Componente | Uso |
|------------|-----|
| `invite-members-modal.tsx` | Modal **Convidar** no board (emails + link) |
| `board-access-modal.tsx` | Modal **Gerenciar acesso** (engrenagem): membros + roles |
| `invite-emails-panel.tsx` | Lista de emails + envio batch |
| `board-members-list.tsx` | Membros atuais + troca de role + remocao (com confirmacao) |
| `share-project-panel.tsx` | Hub de projetos / settings (`showInvite` opcional) |

No board view: botao **Convidar um integrante** (`UserPlus`) abre convite; botao **engrenagem** abre gerenciamento de acesso (sem secao de convite por email).

## Email de convite

Template em `lib/email-templates/board-invite.ts` + tokens `agify-email-brand.ts`:

- Logo Agify (`{APP_URL}/branding/agify.png`)
- Paleta Aurora (fundo `#F4F7FC`, CTA `#7C3AED`)
- Botao **Aceitar convite** com link `/invite?token=`

## Roles

| Role | Label UI | Permissao | UI no board |
|------|----------|-----------|-------------|
| `viewer` | Visualizar | Leitura | Modo leitura (drawer simples, sem criar card/coluna) |
| `admin` | Editor | Escrita no board | UI de edicao completa |
| `manager` | Gerente | Gerencia membros + convites + remove acesso | UI de edicao completa (mesma do editor) |

## RLS

- Convites: org admin ou board `manager` (`can_manage_board_members`)
- Escrita no board: org admin ou board `admin`
- Perfis: `app.shares_board` permite SELECT de perfis entre colegas no mesmo board (convidados board-only)
- Testes: `supabase/tests/08_invitations_test.sql`, `09_profiles_co_board_test.sql`

## Env (servidor)

```env
RESEND_API_KEY=
# Staging: Agify <onboarding@resend.dev>
# Producao: Agify <noreply@seudominio.com> (dominio verificado no Resend)
RESEND_FROM=Agify <noreply@agify.app>
NEXT_PUBLIC_APP_URL=http://localhost:3001
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Seguranca

- `Referrer-Policy: no-referrer` na rota `/invite` (token na query string).
- `RESEND_API_KEY` nunca no cliente.
- Token armazenado como SHA-256; plaintext so no email/link.

## Fast-follow

- Signup sem criar org quando `next` contem `/invite?token=`.
- Webhook Resend (bounce/complaint).

## Migracoes

`supabase/migrations/0004_invitations_and_ical.sql`, `0011_board_manager_rls.sql`
