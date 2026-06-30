# Marcadores (tags) — por projeto

## Escopo

- Marcadores são **por board** (`tags.board_id`), não globais na org.
- Nome único por projeto: `unique(board_id, name)`.

## Critérios de aceite

- Tag criado no board A não aparece no board B
- Admin pode excluir; member não vê lixeira
- Botão **+** na barra de filtros do board cria marcador (nome + cor), mesmo padrão de estágios
