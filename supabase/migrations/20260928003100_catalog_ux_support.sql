-- What the catalog screens need for honest states (D-075; docs/DESIGN.md G1 handoff).
--
-- 1. The field detail lists every approved, rights-cleared photo (not only the first), field photos
--    before venue photos, each with its required credit.
-- 2. catalog_city_counts(city): how many published fields a city has, how many are verified and how
--    many take bookings right now, so the list can tell "nothing reviewed here yet", "listed but
--    none verified" and "your filters match nothing" apart without guessing.

create or replace function public.catalog_pitch(p_pitch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pitch public.pitches;
  v_facility public.facilities;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_pitch from public.pitches where id = p_pitch_id and listing_state = 'published';
  select * into v_facility from public.facilities
  where id = v_pitch.facility_id and listing_state = 'published';
  if v_pitch.id is null or v_facility.id is null then
    return null;
  end if;
  return private.catalog_listing(v_pitch, v_facility, null, null) || jsonb_build_object(
    'siblings', (select coalesce(jsonb_agg(jsonb_build_object(
                          'pitch_id', s.id,
                          'label', jsonb_build_object('ar', s.label_ar, 'en', s.label_en),
                          'badge', s.participation) order by coalesce(s.label_ar, s.label_en), s.id),
                        '[]'::jsonb)
                 from public.pitches s
                 where s.facility_id = v_facility.id and s.id <> v_pitch.id
                   and s.listing_state = 'published'),
    'dimensions', case when v_pitch.length_m is null and v_pitch.width_m is null then null
                       else jsonb_build_object('length_m', v_pitch.length_m,
                                               'width_m', v_pitch.width_m) end,
    'address', case when v_facility.address_ar is null and v_facility.address_en is null then null
                    else jsonb_build_object('ar', v_facility.address_ar,
                                            'en', v_facility.address_en) end,
    'attribution', case when exists (select 1 from public.pitch_evidence e
                                     where (e.pitch_id = v_pitch.id or e.facility_id = v_facility.id)
                                       and e.source_kind = 'osm')
                        then '© OpenStreetMap contributors' end,
    -- Every approved photo of this field or the whole venue, field photos first (D-075).
    'photos', (select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'attribution', m.attribution)
                                         order by (m.pitch_id is not null) desc, m.sort_order, m.created_at),
                                '[]'::jsonb)
               from public.pitch_media m
               where m.facility_id = v_facility.id and m.status = 'approved'
                 and (m.pitch_id = v_pitch.id or m.pitch_id is null)),
    'can_report', true);
end;
$$;

create function public.catalog_city_counts(p_city bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  return (
    select jsonb_build_object(
      'listed', count(*),
      'verified', count(*) filter (where p.participation = 'verified'),
      'bookable', count(*) filter (where private.pitch_is_bookable(p.id)))
    from public.pitches p
    join public.facilities f on f.id = p.facility_id
    where f.city_id = p_city and p.listing_state = 'published' and f.listing_state = 'published');
end;
$$;

revoke execute on function public.catalog_city_counts(bigint) from public, anon;
grant execute on function public.catalog_city_counts(bigint) to authenticated, service_role;

revoke execute on all functions in schema private from public;
