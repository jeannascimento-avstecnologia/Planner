# Microinteracoes Aurora

## Principios

- Duracao 150–250ms; easing `ease-out`.
- Sutil — feedback, nao decoracao.
- `prefers-reduced-motion: reduce` desativa animacoes.

## Tokens (`globals.css`)

- `--motion-duration-fast`: 150ms
- `--motion-duration-normal`: 220ms
- `--motion-ease-out`: cubic-bezier(0.22, 1, 0.36, 1)
- `--motion-hover-lift`: -2px

## Superficies

| Superficie | Hover | Active/Focus |
|------------|-------|--------------|
| Botao primario | shadow-sm, gradiente sutil | scale 0.98 |
| Botao secundario | border accent, bg muted | — |
| Card/tile | lift + shadow | ring se selecionado |
| Link sidebar | bg white/10 | borda esquerda accent |
| Input | border accent | ring accent |
| Modal/painel hub | — | fade + translateY entrada |

## Implementacao

- Classes centralizadas em `apps/web/lib/ui-classes.ts`.
- CSS-first; Motion apenas se necessario (fast-follow).

## Criterios de aceite

- Botoes usam `btnPrimary`/`btnSecondary` estendidos.
- `prefers-reduced-motion` no `globals.css`.
- Hub panel entrada ≤250ms.
