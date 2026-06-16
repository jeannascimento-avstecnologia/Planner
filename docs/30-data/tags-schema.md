# Tags / Marcadores — schema

## Tabelas
- `tags(org_id, name, color)` — unique (org_id, name)
- `card_tags(card_id, tag_id, org_id)` — PK composta

## RLS
- SELECT tags: `is_org_member`
- WRITE tags: `has_org_role admin`
- card_tags: via `can_access_board` / `can_write_board` no card

## Migracao
`supabase/migrations/0003_tags_and_write_board.sql`
