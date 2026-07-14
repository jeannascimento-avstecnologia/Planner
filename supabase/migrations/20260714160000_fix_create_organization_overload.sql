-- Remove overload ambiguo (2 args) que impede RPC com PostgREST.
-- Mantem apenas create_organization(p_name, p_slug, p_legal_name, p_cnpj).

drop function if exists public.create_organization(text, text);

grant execute on function public.create_organization(text, text, text, text) to authenticated;
