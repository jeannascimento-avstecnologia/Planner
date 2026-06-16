# PRD - NextGen Planner

## Contexto
SaaS B2B de gestao de projetos que supera Trello/Planner em fluidez, colaboracao multiplayer e inteligencia de fluxo. Janela de mercado: Trello pivotando para produtividade pessoal e Planner aposentando features (ver `competitive-voc.md`).

## Objetivos (MVP)
- Multi-tenant nativo, mobile-first, offline-first.
- Kanbans com colunas, cards, tags, prioridades, prazos.
- Subtarefas de 1a classe + dependencias finish-to-start.
- Comentarios no card, anexos (Cloudinary), compartilhamento de boards.
- Calendario de prazos + feed iCal.
- Notificacoes inteligentes (digest/granular/DND, in-app + Web Push).
- Dashboard analitico por board (CFD, lead/cycle time, throughput, gargalos).
- Whiteboard nativo (tldraw).

## Nao-objetivos (MVP -> fast-follow)
- Rollup analitico cross-board, audit log + field-level perms, motor de automacao.

## Personas
- ADM (admin): cria/edita boards, gerencia membros e permissoes.
- Leitor (viewer): acesso de leitura aos boards compartilhados.

## Perfis de acesso
RBAC por organizacao via `memberships.role` (admin | viewer) + ACL por board via `board_members`.

## Metricas de sucesso (North Star)
- Tempo de interacao P95 < 100ms (acoes otimistas).
- Ativacao: % de orgs que criam >= 1 board e >= 5 cards na 1a semana.
- Retencao W4; reducao de "notification overload" (opt-out de email < X%).

## Criterios de Aceite (MVP, alto nivel)
- Usuario faz signup/login/reset; cria org; cria board/coluna/card; move card (DnD) com persistencia e tempo real.
- Dados de uma org nunca visiveis a outra (RLS validada por pgTAP).
- Dashboard reflete metricas a partir de `card_events`.
