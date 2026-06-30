# Email transacional e convites em producao

Runbook para configurar Resend + variaveis do app em staging/producao.

Ver spec: [board-sharing.md](../40-api/board-sharing.md) | ADR: [ADR-0002](../20-architecture/ADR-0002-deployment-topology.md)

## Variaveis no host (Vercel ou equivalente)

| Variavel | Escopo | Staging | Producao |
|----------|--------|---------|----------|
| `RESEND_API_KEY` | servidor | `re_...` | `re_...` (key dedicada) |
| `RESEND_FROM` | servidor | `Agify <onboarding@resend.dev>` | `Agify <noreply@seudominio.com>` |
| `NEXT_PUBLIC_APP_URL` | cliente + servidor | `https://staging.seudominio.com` | `https://app.seudominio.com` |
| `UPSTASH_REDIS_REST_URL` | servidor (opcional) | mesmo ou instancia staging | instancia prod |
| `UPSTASH_REDIS_REST_TOKEN` | servidor (opcional) | token staging | token prod |

Nunca commitar segredos. Nunca usar prefixo `NEXT_PUBLIC_` em `RESEND_API_KEY`.

## Resend Dashboard

### Staging (dominio nao verificado)

1. Criar API Key com permissao **Sending access**.
2. Usar `RESEND_FROM=Agify <onboarding@resend.dev>`.
3. Limitacao: emails de teste costumam ir apenas para o email da conta Resend.

### Producao

1. **Domains** → Add Domain (ex. `agify.app`).
2. Configurar registros DNS (SPF, DKIM; DMARC recomendado).
3. Aguardar status **Verified**.
4. Atualizar `RESEND_FROM` para endereco no dominio verificado.
5. Monitorar **Emails → Logs** (delivered, bounced, complained).

## Supabase Auth (mesmo projeto do app)

| Config | Valor |
|--------|-------|
| Site URL | `NEXT_PUBLIC_APP_URL` |
| Redirect URLs | `{APP_URL}/auth/callback` |
| Google OAuth origins | `{APP_URL}` |

## Fluxo de validacao pos-deploy

1. Login como org admin ou board manager.
2. Board → **Convidar um integrante**.
3. Adicionar email de teste → **Enviar convite**.
4. Confirmar mensagem de sucesso ou link copiavel na UI.
5. Abrir link `/invite?token=...` em aba anonima.
6. Login com **mesmo email** convidado → redirect ao board.
7. Verificar membro em **Membros** do modal.

## Rate limit

Com Upstash configurado: maximo **20 convites/hora** por usuario (`ratelimit:{userId}:invite_batch`).

Sem Upstash: limite desabilitado (apenas max 20 por batch no schema Zod).

## Troubleshooting

| Sintoma | Causa provavel | Acao |
|---------|----------------|------|
| "Email nao configurado" | `RESEND_API_KEY` ausente | Adicionar secret e redeploy |
| "Dominio nao verificado" | `RESEND_FROM` sem dominio verified | Verificar DNS no Resend |
| Link aponta localhost | `NEXT_PUBLIC_APP_URL` errado | Corrigir env e rebuild |
| Login perde convite | `next` ausente | Usar fluxo `/invite` (ja redireciona) |
| 429 Resend | quota / rate limit | Aguardar ou upgrade Resend |

## Checklist pre-go-live

- [ ] `RESEND_API_KEY` no painel do host
- [ ] Dominio verificado no Resend (producao)
- [ ] `NEXT_PUBLIC_APP_URL` HTTPS correto
- [ ] Supabase Auth URLs alinhadas
- [ ] `supabase db push` aplicado
- [ ] pgTAP `08_invitations_test.sql` verde
- [ ] E2E `board-invites.spec.ts` verde
- [ ] Teste manual de email recebido
