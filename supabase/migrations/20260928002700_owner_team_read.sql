-- my_venues() also returns, for owners only, the venue's team and open staff links (D-069).
-- Links are listed without their token, which exists only when a link is created (D-068).
create or replace function public.my_venues()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'facility_id', f.id,
             'name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
             'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en)
                      from public.cities c where c.id = f.city_id),
             'role', s.role,
             'listing_state', f.listing_state,
             'operator_state', f.operator_state,
             'fields', (select coalesce(jsonb_agg(jsonb_build_object(
                                'pitch_id', p.id,
                                'label', jsonb_build_object('ar', p.label_ar, 'en', p.label_en),
                                'listing_state', p.listing_state,
                                'badge', p.participation,
                                'players_per_side', p.players_per_side,
                                'surface', p.surface,
                                'indoor', p.indoor,
                                'lights', p.lights,
                                'amenities', to_jsonb(p.amenities),
                                'futsal', p.futsal,
                                'length_m', p.length_m,
                                'width_m', p.width_m,
                                'bookable', private.pitch_is_bookable(p.id),
                                'operations', (select jsonb_build_object(
                                                 'price_per_hour', o.price_per_hour,
                                                 'price_note', jsonb_build_object('ar', o.price_note_ar,
                                                                                  'en', o.price_note_en),
                                                 'slot_minutes', o.slot_minutes,
                                                 'opening_hours', o.opening_hours,
                                                 'schedule_active', o.schedule_active,
                                                 'paused_at', o.paused_at,
                                                 'confirmed_at', o.confirmed_at)
                                               from public.pitch_operations o where o.pitch_id = p.id))
                              order by p.created_at), '[]'::jsonb)
                        from public.pitches p
                        where p.facility_id = f.id and p.listing_state not in ('duplicate', 'rejected')),
             'photos', (select coalesce(jsonb_agg(jsonb_build_object(
                                'id', m.id, 'pitch_id', m.pitch_id, 'path', m.storage_path,
                                'status', m.status) order by m.created_at), '[]'::jsonb)
                        from public.pitch_media m where m.facility_id = f.id),
             -- Owners see their team and open links; staff see neither.
             'team', case when s.role = 'owner' then
                       (select coalesce(jsonb_agg(jsonb_build_object(
                                 'user_id', t.user_id, 'name', p.display_name, 'role', t.role,
                                 'since', t.created_at) order by t.role, t.created_at), '[]'::jsonb)
                        from public.pitch_staff t join public.profiles p on p.id = t.user_id
                        where t.facility_id = f.id) end,
             'links', case when s.role = 'owner' then
                        (select coalesce(jsonb_agg(jsonb_build_object(
                                  'id', i.id, 'created_at', i.created_at, 'expires_at', i.expires_at)
                                  order by i.created_at), '[]'::jsonb)
                         from public.staff_invites i
                         where i.facility_id = f.id and i.accepted_at is null and i.revoked_at is null
                           and i.expires_at > now()) end)
           order by f.created_at), '[]'::jsonb)
    from public.pitch_staff s
    join public.facilities f on f.id = s.facility_id
    where s.user_id = v_uid);
end;
$$;

revoke execute on all functions in schema private from public;
