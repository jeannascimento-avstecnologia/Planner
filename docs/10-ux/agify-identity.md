# Identidade visual Agify

Guia de identidade do produto **Agify** (Prosperfy).

## Paleta

Ver [color-palette.md](color-palette.md).

- **Sidebar (app):** `.aurora-sidebar-gradient` + `.aurora-sidebar-gradient--flow` (loop seamless roxo→azul→navy)
- **Login (fundo externo):** `.aurora-sidebar-pattern` (navy + textura sutil)
- **Top bar:** `.aurora-topbar-solid` (fundo `--color-aurora-topbar-bg` + borda)
- **Card login:** light = lavanda `#F0F4FF`; dark = `#13102A` (Agify Night); tokens `--color-agify-auth-*`; logo acima do card
- **Seleção ativa (Grade/Lista, modos board):** accent sólido (`aurora-accent` / `board-accent`)

## Hierarquia de gradiente

Gradiente = recurso **escasso** (1 job). Hierarquia visual = superfícies + bordas (Agify Night).

| Permitido | Proibido |
|-----------|----------|
| CTA primário global (`.btn-agify-gradient` em `btnPrimary`) | Top bar, card login, perfil |
| Sidebar app (`.aurora-sidebar-gradient` — leve) | Switchers de view (Grade/Lista, Kanban/Timeline) |
| Gradiente na logo PNG (marca, não chrome) | Gradiente forte em cards / shell inteiro |

Referências: Linear (accent sólido), Better Stack (gradiente só no botão primário), Dimension (gradiente nunca em card ou interativo).

## Gradiente da marca

Stops do ícone: sky `#38BDF8` → blue `#3B82F6` → violet `#8B5CF6`.

CTA primário: `--background-image-agify-cta` (`#6366F1` → `#7C3AED`, 135deg).

Links e destaque: token `aurora-brand` (`#7C3AED` light / `#A78BFA` dark Agify Night).

**Dark mode (Agify Night):** fundos e bordas com matiz indigo-violeta; texto secundario lavanda (`#A5AECF`), nao slate cinza.

## Superfícies

| Superfície | Detalhe |
|------------|---------|
| Card login | Fundo navy pattern; logo acima; card lavanda (light) ou `#13102A` (dark) |
| Sidebar | Gradiente leve roxo→azul (`.aurora-sidebar-gradient`); ícones e labels em branco |
| Sidebar colapsada | Ícone `agify-icon.png` (sem clip do logo horizontal) |
| Top bar | Sólido `#0F0D1C` (dark) / `#0F172A` (light) + pills brancas; logo Agify central |
| Perfil | Fundo `aurora-bg`; texto `aurora-fg` / `aurora-muted` |
| Board | `board-*` via `BoardThemeScope`; switcher ativo com `board-accent` sólido |

## Assets

| Arquivo | Uso |
|---------|-----|
| `docs/images/Agify.png` → `public/branding/agify.png` | Top bar, sidebar expandida, login |
| `docs/images/Icon_Agify.png` → `public/branding/agify-icon.png` | Sidebar colapsada |
| `Icon_Agify.png` → `public/favicon.png` | Favicon / ícone web |

## Logo — dimensões de exibição

| Variante | Asset | Altura |
|----------|-------|--------|
| Top bar | agify.png (714×170) | 48–52px |
| Sidebar expandida | agify.png | 36px |
| Auth (login/signup) | agify.png | 56–72px |
| Sidebar colapsada | agify-icon.png (193×157) | 32px |
| Favicon | agify-icon.png | — |

## Regras

1. Sidebar/top bar fora de `board-theme-scope`
2. Pares surface/on-surface para contraste WCAG AA
3. `globals.css` + `color-palette.md` sincronizados
4. Gradiente apenas em `btnPrimary` global; boards usam `btnBoardPrimary` (cor do projeto)
