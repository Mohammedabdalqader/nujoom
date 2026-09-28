-- A venue's staff see their own venue's photos whatever the review status (D-061), so the owner
-- page can show what they uploaded while it waits for review, and why one was rejected. It is the
-- same folder rule as uploading (can_upload_pitch_media). Players still see only approved photos
-- of published venues and fields; admins see everything (D-056).
create or replace function private.can_view_pitch_media(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or (split_part(p_object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and exists (select 1 from public.pitch_staff s
                    where s.facility_id = split_part(p_object_name, '/', 1)::uuid
                      and s.user_id = (select auth.uid())))
    or exists (
      select 1
      from public.pitch_media m
      join public.facilities f on f.id = m.facility_id
      left join public.pitches p on p.id = m.pitch_id
      where m.storage_path = p_object_name and m.status = 'approved'
        and f.listing_state = 'published'
        and (m.pitch_id is null or p.listing_state = 'published'));
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.can_view_pitch_media(text) to authenticated, service_role;
