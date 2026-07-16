# Runbook — Encryption key de integrações + checklist ops P0

> Tabela: `private.integration_config.encryption_key`  
> Consumidores: Tiflux board tokens, Slack org webhooks, Google user tokens (`pgp_sym_encrypt` / `pgp_sym_decrypt`).  
> Ciclo: `HARDENING_PRODUCAO_ESCALA` **P0.3**  
> **Nunca** commitar chave real. **Nunca** rodar rotação automática em app code / CI contra prod.

## Por que

Seed da migration `20260703180000_board_tiflux_secrets.sql`:

```text
local-dev-integrations-key-32chars!!
```

- Insert: `ON CONFLICT (id) DO NOTHING` — **não** sobrescreve chave já existente em envs já rotacionados.
- Não há coluna `is_seed` no schema; detecção = comparação com o literal do seed (alias `is_seed` na query abaixo).
- Seed em **staging/prod** = todos os ciphertexts de integração usam chave pública do repo → risco se DB vazar.

## 1. Verificar se prod ainda usa o seed

SQL Editor (role `postgres` / service), **sem** colar `encryption_key` em tickets/Slack/logs públicos:

```sql
select
  id,
  length(encryption_key) as key_len,
  (encryption_key = 'local-dev-integrations-key-32chars!!') as is_seed
from private.integration_config
where id = 1;
```

| Resultado | Ação |
|-----------|------|
| `is_seed = true` | Rotacionar **agora** (§2) |
| `is_seed = false` e `key_len >= 32` | OK — **não** rode UPDATE de rotação |
| 0 rows | Inserir chave forte **antes** de gravar secrets; não usar o seed |

Aceite P0.3 em prod: `is_seed = false`.

## 2. Rotação segura (seed → chave forte)

### Ordem / downtime

1. Janela curta de manutenção (ideal: minutos).
2. **Pausar** writers de secrets durante a TX se possível:
   - UI: não salvar token Tiflux / Slack / Google OAuth no intervalo.
   - Opcional: pausar `pg_cron` / scheduler do `automation-runner` (evita decrypt mid-flight com chave antiga após swap).
3. Executar **uma** transação: re-encrypt de todas as tabelas + update da key (§2.1).
4. Smoke (§3) → retomar scheduler / writers.
5. Guardar `v_new` no cofre ops (1Password/Vault). **Não** git.

### 2.1 Script (somente se `is_seed = true`)

```sql
begin;

-- Guard: aborta se a chave atual NÃO for o seed
do $$
declare
  v_old text;
begin
  select encryption_key into v_old from private.integration_config where id = 1;
  if v_old is distinct from 'local-dev-integrations-key-32chars!!' then
    raise exception 'abort: chave atual nao e o seed; use procedimento §2.2 (v_old explicito)';
  end if;
end $$;

-- Gere chave >= 32 chars FORA do SQL; cole só na sessão (não commit)
select set_config('app.new_integrations_key', 'SUBSTITUA-POR-CHAVE-FORTE-32+', true);

do $$
declare
  v_old text := 'local-dev-integrations-key-32chars!!';
  v_new text := current_setting('app.new_integrations_key');
begin
  if v_new is null or length(v_new) < 32 then
    raise exception 'app.new_integrations_key invalida';
  end if;
  if v_new = v_old then
    raise exception 'nova chave igual ao seed';
  end if;

  update public.board_integration_secrets s
  set tiflux_api_token_encrypted = extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(s.tiflux_api_token_encrypted, v_old),
    v_new
  );

  update public.org_slack_integrations s
  set webhook_url_encrypted = extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(s.webhook_url_encrypted, v_old),
    v_new
  );

  update public.user_google_tokens t
  set
    access_token_encrypted = extensions.pgp_sym_encrypt(
      extensions.pgp_sym_decrypt(t.access_token_encrypted, v_old), v_new
    ),
    refresh_token_encrypted = extensions.pgp_sym_encrypt(
      extensions.pgp_sym_decrypt(t.refresh_token_encrypted, v_old), v_new
    );

  update private.integration_config
  set encryption_key = v_new
  where id = 1;
end $$;

commit;
```

### 2.2 Rotação quando a chave atual **não** é o seed

Mesmo script, mas:

1. Confirme `is_seed = false` e tenha `v_old` no cofre.
2. Remova o bloco `raise exception` do guard §2.1 **ou** ajuste o guard para exigir `v_old` via `current_setting('app.old_integrations_key')`.
3. Use `v_old := current_setting('app.old_integrations_key')` e `v_new := current_setting('app.new_integrations_key')`.
4. **Não** apague ciphertext antigo fora da TX; **não** faça UPDATE só da key sem re-encrypt (quebra decrypt).

### Proibido

- Migration/`db push` que faça `UPDATE private.integration_config SET encryption_key = …` sem re-encrypt.
- Alterar o seed na migration histórica (quebra parity; `ON CONFLICT DO NOTHING` já protege envs rotacionados).
- Automatizar rotação em Edge/Next neste ciclo.
- Commitar chave em `.env`, docs ou CI logs.

## 3. Pós-rotação / smoke

1. `select … is_seed` → deve ser `false`.
2. Board com Tiflux: `board_tiflux_status` + criar/associar ticket (Next ou Edge `tiflux-create-ticket`).
3. Slack automation (se houver) + Google sync (se houver).
4. Cofre ops atualizado; seed **não** reutilizado.

## 4. Rollback

| Momento | Ação |
|---------|------|
| TX ainda aberta / erro no meio | `rollback;` — ciphertext e key inalterados |
| `commit` ok, smoke falha | **Não** reverter só a key. Re-encrypt de volta: `v_old` = chave nova (ruim), `v_new` = chave anterior do cofre, mesmo UPDATE nas 3 tabelas + `integration_config`. Mantenha janela com ambas as chaves no cofre até smoke verde |
| Ciphertext corrompido | Restaurar backup DB do ponto pré-rotação; **não** apagar rows de secrets “para limpar” |

Risco documentado no plano: rotação errada → Tiflux/Slack/Google decrypt fail. Mitigação = TX única + cofre com old+new + smoke antes de fechar janela.

## 5. Dev local

Banco zerado continua com o seed. Tokens de teste descartáveis. Não precisa rotacionar.

---

## 6. Checklist ops P0 (humano — PR-A3 + P0.2 env + P0.3)

Cruzar pendências P0.1 / P0.2 / P0.3. Ordem sugerida:

### A. Encryption key (P0.3)

- [ ] Rodar query §1 em **prod**
- [ ] Se `is_seed = true` → §2 + smoke §3
- [ ] Confirmar `is_seed = false` no aceito
- [ ] Chave nova só no cofre (não git)

### B. Tiflux env (P0.2)

- [ ] Remover `TIFLUX_API_TOKEN` de env **prod** (Vercel/VPS/`supabase secrets` / hosting) se existir
- [ ] Confirmar que boards usam token via RPC (`board_integration_secrets`), não legacy env
- [ ] Refs: `infra/env/*production*.env.example`, [tiflux-integration.md](../50-components/tiflux-integration.md)

### C. automation-runner (P0.1 / PR-A3)

- [ ] `supabase db push` — migration `20260715160000_claim_automation_outbox.sql` em prod
- [ ] Setar Edge secret `CRON_SECRET` (Dashboard → Edge Functions → secrets)
- [ ] `supabase functions deploy automation-runner`
- [ ] Scheduler / `pg_cron`: invocar com `Authorization: Bearer <CRON_SECRET>` **ou** header `x-cron-secret`
- [ ] Smoke negativo: request sem secret → **401**
- [ ] Spec: [edge-fn-automation-runner.md](../40-api/edge-fn-automation-runner.md)

### D. Gate antes de P1

- [ ] Itens A–C verdes (ou issue explícita com owner + data)
- [ ] WIP P0 commitado/PR mergeável
- [ ] **Debugger** review P0 vs aceite do plano (`HARDENING_PRODUCAO_ESCALA` §P0)
- [ ] Só então: P1 Shared Kernel

---

## Relacionado

- Spec Tiflux: [tiflux-integration.md](../50-components/tiflux-integration.md)
- Deploy/CI: [ci-cd.md](ci-cd.md)
- Migration seed: `supabase/migrations/20260703180000_board_tiflux_secrets.sql`
- Claim outbox: `supabase/migrations/20260715160000_claim_automation_outbox.sql`
