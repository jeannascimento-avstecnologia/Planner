# Design System "Aurora"

## Principios
Mobile-first, fluido (sub-100ms percebido), progressive disclosure, acessivel (WAI-ARIA, AA/AAA).

## Tokens (paleta Aurora)
- Fonte editavel: `docs/10-ux/color-palette.md` + `apps/web/app/globals.css` (`@theme`).
- Semanticos: `aurora-bg`, `aurora-surface`, `aurora-fg`, `aurora-muted`, `aurora-accent`, `aurora-accent-muted`, `aurora-border`.
- Cor em OKLCH opcional; hex do print como referencia. Tema dark: fast-follow visual.
- Escala tipografica fluida (`clamp()`), grid 8pt, radius/elevation/motion tokens.
- Implementacao: Tailwind v4 (`@theme` em CSS) -> tokens viram utilitarios.

## Componentes
- Base: shadcn/ui sobre Radix (acessivel, codigo proprio).
- Animacao: Motion. Icones: Lucide. Toasts: Sonner. Command palette: cmdk. Mobile sheets: vaul.
- Kanban DnD: dnd-kit (nunca react-beautiful-dnd). Whiteboard: tldraw. Charts: Tremor/visx.

## Interacoes-chave
- Optimistic UI em todas as mutacoes; skeletons; transicoes de elemento compartilhado.
- Command palette (Cmd/Ctrl+K); atalhos de teclado no desktop; gestos no mobile.

## Criterios de Aceite
- Contraste AA minimo; navegacao por teclado completa; foco visivel; suporte a dark mode.
