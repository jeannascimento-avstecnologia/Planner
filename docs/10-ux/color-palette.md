# Paleta Aurora Agify (editavel)

Fonte de verdade dos tokens. Replicar em `apps/web/app/globals.css` (`@theme` + `[data-theme="dark"]`).

Identidade visual: ver [agify-identity.md](agify-identity.md).

## Tokens semanticos

| Token | Light | Dark (Agify Night) | Uso |
|-------|-------|---------------------|-----|
| bg | `#F4F7FC` | `#0A0818` | fundo app |
| surface | `#FFFFFF` | `#13102A` | cards, modais |
| auth-card | `#F0F4FF` | `#13102A` | card login |
| auth-field | `#FFFFFF` / `#E2E8F0` | `#1B1738` / `#322E55` | inputs e botoes secundarios no card |
| auth-link | `#7C3AED` | `#A78BFA` | links no card |
| surface-2 | `#EEF2FA` | `#1B1738` | hover/elevacao |
| fg | `#0F172A` | `#EEF0FF` | texto principal |
| muted | `#64748B` | `#A5AECF` | texto secundario (lavanda, nao slate) |
| border | `#E2E8F0` | `#322E55` | bordas com matiz violeta |
| accent | `#2563EB` | `#60A5FA` | primario (links, focus, switcher ativo) |
| accent-muted | `#DBEAFE` | `#1E2855` | hover/focus suave |
| brand | `#7C3AED` | `#A78BFA` | links auth, destaque |
| brand-muted | `#EDE9FE` | `#2A1F5C` | hover CTA |
| sidebar-bg | `#0A0F1F` | `#060A14` | sidebar + painel auth |
| sidebar-fg | `#F8FAFC` | `#EEF0FF` | texto sidebar |
| sidebar-accent | `#60A5FA` | `#818CF8` | nav ativo |
| topbar-bg | `#0F172A` | `#0F0D1C` | top bar sólida (`.aurora-topbar-solid`); dark: um degrau acima de `bg` |
| agify-shell-bg | `#0A0F1F` | `#0A0818` | shell sólido (`.bg-agify-shell-solid`) |
| info | `#0EA5E9` | `#67C8F8` | alinhado ao sky da logo |

Dark mode **Agify Night**: canvas indigo-violeta coerente com a marca; evitar cinzas slate neutros.

## Gradiente marca (logo / legado)

- `--color-agify-gradient-from`: `#38BDF8`
- `--color-agify-gradient-mid`: `#3B82F6`
- `--color-agify-gradient-to`: `#8B5CF6`

## Gradiente CTA (único uso em UI)

- `--background-image-agify-cta`: `linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)`
- Classe: `.btn-agify-gradient` — aplicada via `btnPrimary` (login, criar org, etc.)
- Boards: `btnBoardPrimary` usa cor do projeto (sem gradiente)

## Gradiente auth (legado — não usar em shell)

Mantido em CSS para referência; **não** aplicar em sidebar, topbar ou card login.

- Classe: `.bg-agify-auth-gradient` — descontinuada no shell

## Shell sólido

- Sidebar app: `.aurora-sidebar-gradient` (roxo→azul leve; token `--background-image-agify-sidebar`)
- Login externo: `.aurora-sidebar-pattern` (bg navy + textura diagonal sutil)
- Top bar: `.aurora-topbar-solid` (`background-color: --color-aurora-topbar-bg` + `border-bottom`)

## Seleção ativa (switchers)

- Projetos: `border-aurora-accent bg-aurora-accent`
- Board: `border-board-accent bg-board-accent`
- **Sem** `.agify-selection-active` (classe legada no CSS)

## Prioridades (cores distintas)

- low -> muted; medium -> info; high -> warning; urgent -> danger.

## Contraste

- Texto principal sobre bg/surface: AA minimo nos dois temas.
- Texto branco sobre brand/accent/CTA gradient: AA.

## Tema

- `data-theme="light" | "dark"` no `<html>`. Default segue `prefers-color-scheme`. Persistido em `localStorage` `ngp:theme`.
