# DatePickerPopover

## Objetivo
Selecionar prazo opcional via botao com icone de calendario; mini grade mensal no popover.

## Props
- `name` — campo hidden para forms server action
- `defaultValue?` — ISO date `YYYY-MM-DD`
- `placeholder?` — default "Adicionar prazo"

## Criterios de aceite
- Nenhum `<input type="date">` visivel por padrao.
- Popover abre ao clicar no botao; "Limpar prazo" envia valor vazio.
- Reutiliza `lib/calendar-grid.ts`.

## Codigo
- `apps/web/components/ui/date-picker-popover.tsx`
- Integrado em `card-drawer.tsx`, `board-view.tsx` (quick-create)
