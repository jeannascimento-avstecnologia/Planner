# Redesign da Timeline (Gantt diário)

> Spec filha do épico D. Fonte de verdade da Timeline nesta fase.  
> Pai: [views-interactive.md](../50-components/views-interactive.md).  
> Plano: [fase2-epicos-comerciais.md](../../.cursor/plans/fase2-epicos-comerciais.md).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

A Timeline atual usa janela fixa (-14/+56 dias), posicionamento percentual e drop semanal. Já existem `cards.start_date`, `cards.due_date`, o RPC `update_card_fields`, optimistic cache e a tabela `card_dependencies`. Faltam granularidade diária, metadados completos por linha, zoom, swimlanes, resize, carregamento de dependências e E2E do fluxo.

O schema real de dependências usa `blocker_card_id`/`blocked_card_id` (sem `board_id`). A policy SELECT original (`app.is_org_member`) não atende convidado somente ao board. Exceção aprovada: **uma migration somente de policy** + pgTAP, sem DDL de tabela/coluna.

## Objetivos

- Um card por linha, com título, descrição, estágio efetivo e responsável.
- Agendar e reposicionar por intervalo diário via modal; redimensionar início/fim por handles.
- Reescalar o mesmo domínio em Dia/Semana/Mês/Trimestre sem alterar datas.
- Agrupar após os filtros, sem writes e sem duplicar cards.
- Renderizar dependências finish-to-start entre barras visíveis, inclusive entre lanes.
- Manter write path protegido, optimistic UI, rollback, timezone `T12:00:00.000Z`, mobile e teclado.

## Não-objetivos

- Criar, remover ou editar dependências na Timeline.
- Autoagendamento, caminho crítico, milestones, presets rápidos ou aviso/bloqueio de violação temporal entre dependências.
- Novos filtros, novas tabelas/colunas, Edge Function ou mudança no contrato RPC.
- Virtualização obrigatória antes de medição; só entra se o budget de 200 cards falhar.
- Guard cross-board no DB e audit `dependency_created`/`dependency_removed` (dívidas documentadas em [card-dependencies.md](../30-data/card-dependencies.md)).

## Requisitos

- **TLR-001 Datas:** validar `YYYY-MM-DD`; projetar por ordinal de dia UTC (anti-DST); persistir só com `toTimelineDbDate` (`T12:00:00.000Z`). Intervalos inclusivos.
- **TLR-002 Domínio:** inclui hoje e todos os cards filtrados/agendados, padding de 14 dias, mínimo -14/+56. Zoom altera só `pxPerDay` e ticks. Canvas gera ticks principais, não uma célula DOM por card×dia.
- **TLR-003 Escala:** `day=48`, `week=20`, `month=8`, `quarter=4` px/dia; ticks diários, semanais, mensais e trimestrais. Barras preservam coordenadas diárias.
- **TLR-004 Layout:** coluna de metadados sticky (`TIMELINE_LABEL_COL_PX=280`); trilha com scroll horizontal; altura de linha fixa e header de swimlane `TIMELINE_LANE_HEADER_PX=34` (geometria determinística, sem medir DOM por frame). Coluna: faixa vertical na cor do estágio, chip de estágio (cor a 18% de opacidade), avatar de responsável (iniciais + hue do `assignee_id`). Barra na trilha usa a cor do estágio (texto escuro). Toolbar: dois segmented controls (Agrupar à esquerda, Zoom à direita); ativo = accent sólido + texto escuro. Flag `HOJE ·` no tick de hoje. Setas FS: stroke `#f0883e`, tracejado, círculo na origem.
- **TLR-005 Modal:** dois `DatePickerPopover`; erro `aria-live`; salvar bloqueado se inválido ou início > fim. Backlog: ambos os campos = dia do drop. Reposicionamento: duração preservada, intervalo deslocado.
- **TLR-006 DnD/resize:** um canvas droppable; X→dia. Sensores: `KANBAN_DRAG_ACTIVATION_CONSTRAINT`. Resize: IDs por borda, preview local, um write no drag end. Drop de barra/backlog **abre modal**; nenhum write antes de confirmar. Resize persiste direto.
- **TLR-007 Estado:** `timelineZoom` e `timelineGroup` na URL via `useClientSearchParamState`. Defaults omitidos: `week`, `none`. Valor inválido cai no default. `replaceState` preserva `view`/`cardId`.
- **TLR-008 Agrupamento:** `none` | `column` | `assignee` | `tag` | `stage`. Estágio via `resolveCardStage`. Tags: uma lane por combinação de IDs ordenados pelo catálogo (card aparece uma vez). Lanes vazias omitidas. “Sem responsável/estágio/marcador” no fim.
- **TLR-009 Pipeline:** `safeCards → matchesFilters (BoardView) → deriveTimelineLanes → layout → barras/setas`. `CardFilterBar` intocado. Backlog sem período separado, não duplicado nas lanes.
- **TLR-010 Dependências:** carregar `type='finish_to_start'` cujo blocker e blocked estejam no conjunto do board. Desenhar só com ambas as barras visíveis. Path: fim do blocker → início do blocked. Stroke `#f0883e`, `stroke-dasharray="4 3"`, círculo `r=2.5` na origem. `pointer-events: none`. Display-only.
- **TLR-011 Segurança:** SELECT via `app.can_access_board` no board do blocker + vínculo `org_id`. Org member, board-only member e usuário externo cobertos por pgTAP. Write de datas só via `updateCardFieldsAction`.
- **TLR-012 Performance/a11y:** derivação O(cards + deps), memoizada; sem `getBoundingClientRect` em loop de scroll/drag; long task < 100 ms em 200 cards; alvo interativo 16 ms. Modal: foco no primeiro campo, Escape, labels, salvar/cancelar por teclado.

## Critérios de aceite

- [ ] Cada card agendado ocupa uma linha com título, descrição, estágio efetivo e responsável visíveis.
- [ ] Drop de card sem período abre modal; confirmar início/fim posiciona a barra no intervalo diário e persiste após reload.
- [ ] Drop de barra existente abre modal com duração preservada; nenhuma data é escrita antes de confirmar.
- [ ] Resize esquerdo/direito altera só o limite correspondente, snap diário, optimistic UI/rollback, sem intervalo invertido.
- [ ] Dia/Semana/Mês/Trimestre mudam escala/ticks sem alterar `start_date`/`due_date`.
- [ ] Agrupamento reorganiza os mesmos cards, sem request de escrita; multi-tag aparece uma vez na lane de combinação.
- [ ] Filtros existentes aplicam-se antes do agrupamento.
- [ ] Setas FS ligam os cards corretos entre lanes; endpoint filtrado/sem período/não renderizado some a seta.
- [ ] Membro somente do board lê setas; usuário sem acesso ao board não lê dependências.
- [ ] Início > fim bloqueia salvar com feedback claro.
- [ ] Viewer sem drag/resize; 403 do RPC restaura o cache.
- [ ] Mobile: coluna de contexto utilizável + scroll horizontal; modal operável por teclado.
- [ ] Cenário sintético com 200+ cards respeita o budget (16 ms cálculo / 100 ms long task).

## Questões abertas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | Persistência de zoom/grupo | URL search params por board (`timelineZoom`, `timelineGroup`) |
| 2 | Presets de período | Fast-follow |
| 3 | Violação temporal de dependência | Só exibir; sem bloquear/alertar nesta fase |
| 4 | Categorias ausentes | Fim da lista |
| 5 | Multi-tag | Lane por combinação; um card por linha |
| 6 | Reposicionamento vs modal | Drop abre modal; resize persiste direto |
| 7 | RLS SELECT de deps | Migration isolada de policy + pgTAP (exceção aprovada) |

## Specs vinculadas

- [GUIA_MESTRE.md](../GUIA_MESTRE.md)
- [views-interactive.md](../50-components/views-interactive.md)
- [board-view-modes.md](../50-components/board-view-modes.md)
- [card-dependencies.md](../30-data/card-dependencies.md)
- [field-level-permissions.md](../50-components/field-level-permissions.md)
- [performance-budgets.md](../60-quality/performance-budgets.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| TLR-001/002/003 | `lib/timeline-schedule.ts`, `lib/timeline-scale.ts` | Vitest schedule/scale |
| TLR-004/006 | `board-timeline-view.tsx`, `timeline-row.tsx` | Playwright 1–3 |
| TLR-005 | `timeline-period-modal.tsx` | Playwright 1 e 8 |
| TLR-007 | `client-url-state.ts` (reuso), parsers em `timeline-scale.ts` | Vitest + Playwright URL |
| TLR-008/009 | `lib/timeline-grouping.ts`, `board-view.tsx` | Vitest + Playwright 4–6 |
| TLR-010 | `lib/timeline-dependencies.ts`, `timeline-dependency-layer.tsx`, loader | Vitest + Playwright 7 |
| TLR-011 | `*_card_dependencies_select_board_access.sql` | `50_card_dependencies_select_test.sql` |
| TLR-012 | `scripts/ui-render-stress-bench.mjs` | bench 200/500 + checklist a11y |
