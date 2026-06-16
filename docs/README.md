# Documentacao (Spec-Driven Development)

Specs sao a fonte de verdade. Nenhuma linha de codigo sem spec aprovada. Leia tambem `docs/GUIA_MESTRE.md` (guardrails de engenharia) e o plano ativo em `.cursor/plans/`.

## Processo SDD

1. Searcher levanta contexto -> 2. Gerente escreve/atualiza spec + ADR -> 3. Programador implementa contra a spec -> 4. Debugger revisa vs criterios de aceite -> 5. Tester escreve E2E/RLS -> 6. Mentor atualiza ADR/README/changelog.

## Template de spec

```
# <Titulo>
- Contexto
- Objetivos / Nao-objetivos
- Requisitos
- Criterios de Aceite (testaveis)
- Questoes Abertas
- Specs vinculadas
- Matriz: Spec -> Codigo -> Teste
```

## Indice e status

| Spec | Caminho | Status |
|---|---|---|
| Guia Mestre (guardrails) | `GUIA_MESTRE.md` | OK |
| PRD / Visao | `00-product/PRD.md` | OK |
| Competitive / Voice of Customer | `00-product/competitive-voc.md` | OK |
| ADR-0001 Stack | `20-architecture/ADR-0001-stack.md` | OK |
| Multi-tenancy & Seguranca | `20-architecture/multitenancy-security.md` | OK |
| ERD / Schema | `30-data/erd.md` | OK |
| Politicas RLS | `30-data/rls-policies.md` | OK |
| Modelo de Analytics | `30-data/analytics-model.md` | OK |
| API / Edge Functions | `40-api/edge-functions.md` | OK |
| Notificacoes inteligentes | `40-api/notifications.md` | OK |
| Design System (Aurora) | `10-ux/design-system.md` | OK |
| Estrategia de Testes | `60-quality/test-strategy.md` | OK |
| CI/CD | `70-ops/ci-cd.md` | OK |
| Ambientes & Paridade | `70-ops/environments.md` | OK |
| Component specs | `50-components/` | TODO (por sprint) |
| Realtime / Caching detalhados | `20-architecture/` | TODO (por sprint) |
| Whiteboard spec | `40-api/whiteboard.md` | TODO (S7) |
