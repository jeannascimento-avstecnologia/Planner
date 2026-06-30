# Microinteracoes Aurora

## Principios

- Duracao 150–250ms; easing `ease-out` / `ease-enter` (Linear-style).
- Sutil — feedback, nao decoracao.
- `prefers-reduced-motion: reduce` desativa animacoes; overlay sem blur.

## Tokens (`globals.css`)

| Token | Valor | Uso |
|-------|-------|-----|
| `--motion-duration-fast` | 150ms | Hover, overlay fade |
| `--motion-duration-normal` | 220ms | Drawer, hub panel |
| `--motion-duration-modal` | 240ms | Modal enter |
| `--motion-ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | Saida / hover |
| `--motion-ease-enter` | cubic-bezier(0, 0, 0.2, 1) | Entrada modal/drawer |
| `--motion-ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Saida rapida |
| `--motion-hover-lift` | -2px | Cards/tiles |

## Classes de superficie

| Classe | Uso |
|--------|-----|
| `.aurora-overlay` | Backdrop tokenizado + blur |
| `.aurora-overlay-enter` | Fade do backdrop |
| `.aurora-modal-panel` | Painel elevado (app) |
| `.aurora-modal-panel--board` | Painel com glow do board-accent |
| `.aurora-modal-hairline` | Gradiente 2px no topo (modais app) |
| `.aurora-modal-enter` | Entrada opacity + translateY + scale |
| `.aurora-drawer-enter` | Slide da direita |
| `.aurora-success-pulse` | Feedback sucesso inline |
| `.aurora-badge-pop` | Badge notificacao |

## Componentes UI (`components/ui/`)

| Componente | Tipo | Variant |
|------------|------|---------|
| `AuroraOverlay` | backdrop | — |
| `AuroraModal` | modal | `app` \| `board` |
| `AuroraDrawer` | drawer | `board` |
| `AuroraPopover` | popover | `app` \| `board` |

## Superficies interativas

| Superficie | Hover | Active/Focus |
|------------|-------|--------------|
| Botao primario | shadow-sm, gradiente sutil | scale 0.98 |
| Botao secundario | border accent, bg muted | translateY 2px |
| Card/tile | lift + shadow | ring se selecionado |
| Chip filtro | border accent | — |
| Link sidebar | bg white/10 | borda esquerda accent |
| Input | border accent | ring accent |
| Modal/painel | — | aurora-modal-enter |

## Implementacao

- Classes centralizadas em `apps/web/lib/ui-classes.ts`.
- Primitivos em `apps/web/components/ui/aurora-*.tsx`.
- CSS-first; Motion apenas se necessario (fast-follow).
- Toasts: Sonner em `components/ui/sonner.tsx`.

## Matriz migracao (modais)

| Arquivo | Primitivo | Variant |
|---------|-----------|---------|
| `confirm-dialog.tsx` | AuroraModal | app, sm |
| `board-access-modal.tsx` | AuroraModal | app, lg |
| `invite-members-modal.tsx` | AuroraModal | app, lg |
| `project-settings-modal.tsx` | AuroraModal | app, lg |
| `stage-manager-modal.tsx` | AuroraModal | board, md |
| `tiflux-*-modal.tsx` | AuroraModal | board, md |
| `deadline-agenda-modal.tsx` | AuroraModal | app, md |
| `card-drawer.tsx` | AuroraDrawer | board |
| `notification-bell.tsx` | AuroraPopover | app |
| `date-picker-popover.tsx` | AuroraPopover | contextual |

## Criterios de aceite

- Botoes usam `btnPrimary`/`btnSecondary` estendidos.
- `prefers-reduced-motion` no `globals.css`.
- Modais usam `aurora-overlay` (nao `bg-black/40`).
- Invite page dentro de `AuthLayoutShell`.
