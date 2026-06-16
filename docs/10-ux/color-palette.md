# Paleta Aurora (editavel)

Fonte de verdade dos tokens. Replicar em `apps/web/app/globals.css` (`@theme` + `[data-theme="dark"]`).

## Tokens semanticos

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| bg | `#F6F8FC` | `#0F141C` | fundo app |
| surface | `#FFFFFF` | `#161D29` | cards, modais |
| surface-2 | `#EEF2F9` | `#1F2937` | superficie elevada/hover |
| fg | `#1E293B` | `#E5EDF7` | texto principal |
| muted | `#64748B` | `#94A3B8` | texto secundario |
| border | `#E2E8F0` | `#293445` | bordas |
| accent | `#6366F1` | `#818CF8` | primario (indigo vivo) |
| accent-muted | `#E0E7FF` | `#312E81` | hover/focus/active suave |
| success | `#10B981` | `#34D399` | sucesso/no prazo |
| warning | `#F59E0B` | `#FBBF24` | atencao |
| danger | `#EF4444` | `#F87171` | atrasado/urgente |
| info | `#0EA5E9` | `#38BDF8` | informativo |

## Prioridades (cores distintas)
- low -> muted; medium -> info; high -> warning; urgent -> danger.

## Contraste
- Texto principal sobre bg/surface: AA minimo nos dois temas.
- Texto branco sobre accent/success/danger/warning: AA.

## Tema
- `data-theme="light" | "dark"` no `<html>`. Default segue `prefers-color-scheme`. Persistido em `localStorage` `ngp:theme`.
