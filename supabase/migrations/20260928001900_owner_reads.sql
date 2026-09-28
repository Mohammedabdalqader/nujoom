-- The venue owner's read side (D-058): what the owner pages on the website show. Each person sees
-- only the venues they are staff of, and only their own claims. Admin-only material (contacts,
-- outreach notes, reviewer history, other claimants, player reports) is never included.

create function public.my_venues()
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
                                'bookable', private.pitch_is_bookable(p.id),
                                'operations', (select jsonb_build_object(
                                                 'price_per_hour', o.price_per_hour,
                                                 'price_note', jsonb_build_object('ar', o.price_note_ar,
                                                                                  'en', o.price_note_en),
                                                 'slot_minutes', o.slot_minutes,
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
                        from public.pitch_media m where m.facility_id = f.id))
           order by f.created_at), '[]'::jsonb)
    from public.pitch_staff s
    join public.facilities f on f.id = s.facility_id
    where s.user_id = v_uid);
end;
$$;

create function public.my_claims()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'facility_id', c.facility_id,
           'name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
           'status', c.status,
           'created_at', c.created_at,
           'decided_at', c.decided_at) order by c.created_at desc), '[]'::jsonb)
  from public.facility_claims c
  join public.facilities f on f.id = c.facility_id
  where c.user_id = (select auth.uid());
$$;

revoke execute on function public.my_venues(), public.my_claims() from public, anon;
grant execute on function public.my_venues(), public.my_claims() to authenticated, service_role;

revoke execute on all functions in schema private from public;
