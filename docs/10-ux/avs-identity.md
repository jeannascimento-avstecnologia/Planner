# Identidade visual AVS Flow

Guia de identidade do produto **AVS Flow**.

## Paleta

Ver [color-palette.md](color-palette.md).

- **Navy sidebar + login:** `.aurora-sidebar-pattern` (`#0A1145` / `#060A2E`)
- **Top bar:** vermelho sólido `#DC2626` / `#B91C1C` — **sem textura**
- **Logo:** fundo branco `rounded-lg` na sidebar

## Superficies

| Superficie | Detalhe |
|------------|---------|
| Login | Fundo navy texturado full-screen; card branco central |
| Sidebar | Logo PNG + nav (Calendário acima de Projetos) |
| Top bar | Título rota ou pill modo view; **AVS Flow** central em branco; ícones em botões brancos |
| Perfil | Fundo navy texturado (`aurora-sidebar-pattern`); card branco |
| Board | `board-*` via `BoardThemeScope` |

## Sidebar — nav

Ordem: **Home** → Calendário → Projetos.

## Sidebar — logo

| Estado | Click |
|--------|-------|
| Colapsada | Expande sidebar |
| Expandida | Navega para `/boards` (Home) |

| Estado | Visual |
|--------|--------|
| Colapsada | Logo inteiro `h-7` proporcional em fundo branco |
| Expandida | Logo `h-10` max 140px |

## Projetos — views

Ver [projects-list-view.md](../50-components/projects-list-view.md).

## Marcadores

Ver [tag-management.md](../50-components/tag-management.md).

## Regras

1. Sidebar/top bar fora de `board-theme-scope`
2. Segredos server-side (ADR-0002)
3. `globals.css` + `color-palette.md` sincronizados
