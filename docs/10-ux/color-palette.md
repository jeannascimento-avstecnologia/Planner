# Paleta Aurora AVS (editavel)

Fonte de verdade dos tokens. Replicar em `apps/web/app/globals.css` (`@theme` + `[data-theme="dark"]`).

Identidade visual: ver [avs-identity.md](avs-identity.md).

## Tokens semanticos

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| bg | `#F4F6FB` | `#0B1020` | fundo app |
| surface | `#FFFFFF` | `#121A2E` | cards, modais |
| surface-2 | `#EEF2F9` | `#1A2438` | hover/elevacao |
| fg | `#1E293B` | `#E8EDF7` | texto principal |
| muted | `#64748B` | `#94A3B8` | texto secundario |
| border | `#E2E8F0` | `#2A3548` | bordas |
| accent | `#1D4ED8` | `#3B82F6` | primario (azul AVS) |
| accent-muted | `#DBEAFE` | `#1E3A5F` | hover/focus/active suave |
| sidebar-bg | `#0A1145` | `#060A2E` | sidebar + painel auth |
| sidebar-fg | `#F8FAFC` | `#E8EDF7` | texto sidebar |
| sidebar-accent | `#3B82F6` | `#60A5FA` | nav ativo sidebar |
| brand-red | `#DC2626` | `#DC2626` | destaque "AVS" |
| topbar-bg | `#DC2626` | `#B91C1C` | top bar vermelho sólido (sem textura) |

## Prioridades (cores distintas)
- low -> muted; medium -> info; high -> warning; urgent -> danger.

## Contraste
- Texto principal sobre bg/surface: AA minimo nos dois temas.
- Texto branco sobre accent/success/danger/warning: AA.

## Tema
- `data-theme="light" | "dark"` no `<html>`. Default segue `prefers-color-scheme`. Persistido em `localStorage` `ngp:theme`.
