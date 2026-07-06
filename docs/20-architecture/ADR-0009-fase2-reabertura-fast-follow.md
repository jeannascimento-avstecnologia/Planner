# ADR-0009: Reabertura Fase 2 — fast-follow comercial

- Status: Aceito
- Data: 2026-07-06

## Contexto

O [GUIA_MESTRE.md](../GUIA_MESTRE.md) seção 6 classificava como fast-follow: audit log, permissões field-level e motor de automação. O MVP (S1–S8) foi concluído. Product owner autorizou estes itens como **Fase 2 oficial** para vendas B2B e diferenciação comercial.

## Decisão

1. Reclassificar os 6 épicos (A–F) como escopo Fase 2, não fast-follow ad hoc.
2. Manter ordem por dependência técnica (ver `.cursor/plans/fase2-epicos-comerciais.md`).
3. Cada épico exige spec SDD em `docs/` antes de código.
4. Atualizar GUIA_MESTRE seção 6 referenciando este ADR.

## Épicos incluídos

| ID | Nome | Antes |
|----|------|-------|
| A | Automações ECA | fast-follow |
| B | Multiplayer avançado | parcial MVP (Realtime Kanban) |
| C | Whiteboard tldraw | MVP S8 (não entregue) |
| D | Views interativas | parcial (read-only timeline/calendar/table) |
| E | Workload / capacidade | novo |
| F | Enterprise (audit, field-level, SSO) | fast-follow |

## Alternativas consideradas

- Manter fast-follow indefinido: rejeitado (bloqueia roadmap comercial).
- Implementar tudo em paralelo sem `card_events`: rejeitado (duplicação, audit/automation inconsistentes).

## Consequências

- ADR-0010 e ADR-0011 obrigatórios antes de épico A/F.
- Plano ativo em `.cursor/plans/fase2-epicos-comerciais.md`.
- Rollup cross-board analítico permanece fast-follow (fora desta fase).
