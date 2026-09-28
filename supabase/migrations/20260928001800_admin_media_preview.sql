-- Admins must see a photo before approving it (D-056): the storage read rule for pitch-media
-- now also lets admins view pending and rejected files. Players still see only approved photos
-- of published venues and fields.
create or replace function private.can_view_pitch_media(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
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
