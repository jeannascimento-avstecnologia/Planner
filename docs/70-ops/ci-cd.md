# CI/CD

## Pipeline (GitHub Actions)
1. Setup Node 20 + cache npm.
2. `npm ci`.
3. `npm run lint` + `npm run typecheck`.
4. `npm run test` (Vitest).
5. **DB gate (runner efemero):** `supabase start` no GitHub Actions, `supabase db reset`, pgTAP. **Nao** e o ambiente de dev do desenvolvedor — dev local usa Supabase Cloud (ADR-0002).
6. Checar `supabase gen types` (sem diff).
7. Build (`npm run build`).
8. (PR) Playwright E2E contra preview.

## Deploy
- **Web:** Vercel (preview por PR, prod em main) — hosting separado do Supabase.
- **DB:** Supabase Cloud — `supabase db push` por ambiente; Branching por PR quando habilitado.

## Regras
- Migracao que nao aplica em banco zerado = build vermelho.
- pgTAP vermelho = bloqueia merge.
- Segredos de producao apenas em secrets do CI/hosting, nunca no repo.

## Dev local vs CI

| | Dev (sua maquina) | CI (GitHub runner) |
|--|-------------------|---------------------|
| Next.js | `npm run dev` | `npm run build` |
| Supabase | Cloud remoto | Docker efemero (`supabase start`) |
| Docker Desktop | Nao obrigatorio | Fornecido pelo runner |
