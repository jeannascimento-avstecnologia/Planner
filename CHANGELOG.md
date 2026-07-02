# Changelog

## 2026-07-02 — Menu Organizacoes + Multi-org + Fix Owner

### Fixed
- Owner da org pode gerenciar participantes de boards (`isOrgAdminRole` no app layer)

### Added
- Cookie de org ativa `ngp:active-org` (ADR-0007)
- Rota `/settings/organizations` com busca, criar org, engrenagem, mover projeto
- Item "Organizacoes" na sidebar
- RPC `move_board_to_org` + pgTAP test 25
- E2E: org-switcher, org-move-board, organizations-menu

### Changed
- Home, Calendario e criar projeto respeitam org ativa
- Settings org singular usa org ativa do cookie
