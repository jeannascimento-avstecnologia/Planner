# Board filters — CardFilterBar

## Contexto
Filtrar cards do projeto por multiplos criterios simultaneos (combinacao AND entre dimensoes).

## Requisitos
- Barra unica em linha dentro do projeto.
- **Prazo**: presets `3d` / `5d` / `10d` / `30d` (proximos N dias a partir de hoje) OU dia exato via `DatePickerPopover`. Mutuamente exclusivos; limpavel.
- **Responsavel**: multi-selecao (membros + "sem responsavel"). Card passa se `assignee_id` ∈ selecao.
- **Marcador**: multi-selecao. Logica de **uniao** (card tem qualquer marcador selecionado).
- **Titulo**: busca textual (case-insensitive, `includes`).
- Botao "Limpar" reseta tudo. Mantem o toggle "Por responsavel" (swimlanes).

## Logica
- AND entre dimensoes; OR dentro de responsavel e marcador.
- Prazo preset: `due_date` entre hoje e hoje+N (inclusive), card sem prazo nao passa quando filtro ativo.
- Prazo dia exato: mesma data (YYYY-MM-DD).

## Criterios de aceite
- Selecionar marcador + preset 7d reduz cards visiveis.
- Multiplos responsaveis somam resultados.
- Nenhum `<input type="date">` visivel por padrao (usa popover).

## Matriz Spec -> Codigo -> Teste
- `apps/web/components/board/card-filter-bar.tsx`
- `apps/web/components/board/board-view.tsx`
- E2E: `apps/web/e2e/ux-refinements.spec.ts` (filtro multi)
