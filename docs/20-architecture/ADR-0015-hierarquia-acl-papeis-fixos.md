# ADR-0015: Hierarquia ACL — papéis fixos unificados (MVP)

- Status: Aceito
- Data: 2026-07-17
- Relacionado: ADR-0006, `docs/40-api/board-sharing.md`, `docs/40-api/organization-management.md`, plano `hierarquia_acl_unificada`

## Contexto

Labels e poderes Org × Dept × Projeto não comunicavam hierarquia empresarial. No projeto, Editor (`admin`) e Gerente (`manager`) ficaram com o mesmo poder (write + ACL) após `20260717130000`. Org usava `owner|manager` para convites — desalinhado do padrão Admin = gestão de pessoas.

## Decisão

1. **Org** — `can_manage_org_members` = `owner|admin`. Labels: Proprietário / Administrador / Gerente / Visualizador. Gerente org = operação (sem convites org).
2. **Projeto** — Administrador = `manager` (write + ACL + settings); Editor = `admin` (write sem ACL); Visualizador = `viewer`. Reverter Editor gerindo ACL.
3. **Bypass org no board** — **só Proprietário** recebe ACL (`members.*` / `can_manage_board_members`). Org `admin` mantém write de conteúdo, **sem** gerenciar acessos do projeto (salvo se for também `manager` no board).
4. **Departamento** — Gerente = membros + write; Administrador = write; Visualizador = leitura (inalterado em poder).
5. Sem papel comment-only. Enums DB não renomear.
6. Presets de acesso (ADR-0016): CRUD custom = só owner; assign = quem tem manage_members.

## Consequências

- Breaking: org Gerentes perdem convites → promover para Administrador (runbook).
- Breaking: org Admin perde ACL de board por bypass (migration `20260717190000`); precisa ser board Administrador ou Owner.
- UI/TS alinhados a RLS; Vitest + pgTAP atualizados.
- ADR-0006: owner|admin gerenciam **membros da org**; ACL de **projeto** = owner + board manager.

## Alternativas rejeitadas

- Manter Editor com ACL: confunde hierarquia; rejeitado.
- Renomear enums DB: breaking massivo; rejeitado (só labels UI).
