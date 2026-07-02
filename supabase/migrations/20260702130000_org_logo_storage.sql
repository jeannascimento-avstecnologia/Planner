-- =====================================================================
-- 20260702130000 - Supabase Storage bucket for org logos (local / fallback)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-logos',
  'org-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy org_logo_public_read on storage.objects
  for select to public
  using (bucket_id = 'org-logos');

create policy org_logo_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] in (
      select m.org_id::text
      from public.memberships m
      where m.user_id = (select auth.uid())
        and m.role in ('admin'::public.membership_role, 'owner'::public.membership_role)
    )
  );

create policy org_logo_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] in (
      select m.org_id::text
      from public.memberships m
      where m.user_id = (select auth.uid())
        and m.role in ('admin'::public.membership_role, 'owner'::public.membership_role)
    )
  );

create policy org_logo_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] in (
      select m.org_id::text
      from public.memberships m
      where m.user_id = (select auth.uid())
        and m.role in ('admin'::public.membership_role, 'owner'::public.membership_role)
    )
  );
