# Integração Tiflux

## Escopo MVP

- Projeto com `tiflux_enabled = true` exibe botões **Criar** e **Associar** em cards sem ticket.
- **Criar:** modal com campos completos → `POST /tickets`.
- **Associar:** modal com Empresa, Mesa, Ticket (+ pai/filho opcionais) → `GET /tickets/{n}` + persistência em `cards.tiflux_*`.
- Badge `#<ticket_number>` após vincular.
- Filtro na barra do board: dropdown pesquisável por tickets vinculados no projeto.

## Fluxos

1. Hub → engrenagem (tile ou painel do projeto) → **Vincular ao Tiflux**.
2. Board → card sem ticket → **Criar** ou **Associar**.
3. Filtros → **Ticket Tiflux** (somente se Tiflux habilitado).

## Segredos

- `TIFLUX_API_TOKEN` — somente servidor
- Nunca `NEXT_PUBLIC_*`

## Critérios de aceite

- Criar e Associar só em projetos Tiflux e cards sem ticket
- Associar valida ticket na API antes de salvar
- Filtro por ticket oculto se Tiflux desabilitado
- Falha de API sem expor token
