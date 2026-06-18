# Visualização Lista — página Projetos

## Contexto

Página `/boards` (Projetos) oferece duas visualizações via `?layout=grid|list`.

## Modos

| Modo | Query | UI |
|------|-------|-----|
| Grade | default / `grid` | Cards responsivos (atual) |
| Lista | `list` | Tabela agrupada estilo Tiflux |

## Lista — agrupamento

Dropdown **Agrupar por**:

| Chave | Grupos |
|-------|--------|
| `nome` | Primeira letra A–Z |
| `responsavel` | `created_by` profile ou "Sem responsavel" |
| `data` | Mês de `created_at` |
| `prazo` | Mês do próximo `due_date` aberto ou "Sem prazo" |

Cabeçalhos colapsáveis: `{label} ({count})`.

## Colunas

Nome | Descrição | Responsável | Criado em | Próximo prazo | Cards abertos

Linha clicável → `/boards/[id]`.

## Fora de escopo

- Agrupar por marcadores (rollup cross-board)

## Critérios de aceite

- Toggle Grade/Lista persiste query
- Agrupamentos corretos
- Filtros da home (deadline tiles) inalterados
