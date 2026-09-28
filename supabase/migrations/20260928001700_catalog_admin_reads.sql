-- Admin read side of the catalog (D-053): what the web admin needs to review imports, claims,
-- reports, photos and stale listings. Admin-only (`forbidden` otherwise); players still only
-- ever see published listings through search_pitches / catalog_pitch.

-- The admin home: how much is waiting, per queue.
create function public.admin_catalog_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'candidates', (select count(*) from public.facilities where listing_state = 'candidate'),
    'published', (select count(*) from public.facilities where listing_state = 'published'),
    'verified_fields', (select count(*) from public.pitches where participation = 'verified'),
    'sources_changed', (select count(*) from public.source_records where needs_review),
    'open_claims', (select count(*) from public.facility_claims
                    where status in ('submitted', 'evidence_requested')),
    'pending_reports', (select count(*) from public.community_submissions where status = 'pending'),
    'pending_media', (select count(*) from public.pitch_media where status = 'pending'),
    'stale_due', (select count(*) from private.stale_verified_fields() where due));
end;
$$;

-- Venues in any state, newest first, with their fields and what is waiting on them.
create function public.admin_catalog_listings(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_state text := coalesce(p ->> 'state', 'candidate');
  v_q text := nullif(private.normalize_ar(p ->> 'q'), '');
  v_city bigint := (p ->> 'city_id')::bigint;
  v_limit integer := least(greatest(coalesce((p ->> 'limit')::integer, 25), 1), 100);
  v_offset integer := greatest(coalesce((p ->> 'cursor')::integer, 0), 0);
  v_rows jsonb;
begin
  perform private.require_admin();
  if v_state not in ('all', 'candidate', 'published', 'hidden', 'duplicate', 'closed', 'rejected') then
    raise exception 'invalid_filter' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(jsonb_agg(item order by ord), '[]'::jsonb) into v_rows
  from (
    select row_number() over (order by f.created_at desc, f.id) as ord,
           jsonb_build_object(
             'facility_id', f.id,
             'name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
             'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en)
                      from public.cities c where c.id = f.city_id),
             'listing_state', f.listing_state,
             'operator_state', f.operator_state,
             'access', f.access,
             'location_confidence', f.location_confidence,
             'created_at', f.created_at,
             'last_reviewed_at', f.last_reviewed_at,
             'fields', (select coalesce(jsonb_agg(jsonb_build_object(
                                'pitch_id', pi.id,
                                'label', jsonb_build_object('ar', pi.label_ar, 'en', pi.label_en),
                                'listing_state', pi.listing_state,
                                'badge', pi.participation,
                                'players_per_side', pi.players_per_side,
                                'surface', pi.surface) order by pi.created_at), '[]'::jsonb)
                        from public.pitches pi where pi.facility_id = f.id),
             'waiting', jsonb_build_object(
               'sources_changed', (select count(*) from public.source_records s
                                   where s.facility_id = f.id and s.needs_review),
               'claims', (select count(*) from public.facility_claims cl
                          where cl.facility_id = f.id and cl.status in ('submitted', 'evidence_requested')),
               'reports', (select count(*) from public.community_submissions r
                           where r.facility_id = f.id and r.status = 'pending'),
               'media', (select count(*) from public.pitch_media m
                         where m.facility_id = f.id and m.status = 'pending'))) as item
    from public.facilities f
    where (v_state = 'all' or f.listing_state::text = v_state)
      and (v_city is null or f.city_id = v_city)
      and (v_q is null or f.search_text like '%' || v_q || '%')
  ) r
  where r.ord > v_offset and r.ord <= v_offset + v_limit + 1;

  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(v_rows) x
                                                  limit v_limit) s), '[]'::jsonb),
    'next_cursor', case when jsonb_array_length(v_rows) > v_limit then v_offset + v_limit end);
end;
$$;

-- Everything about one venue a reviewer needs to decide: facts, the evidence and sources behind
-- them, history, claims, contacts, outreach, photos and reports.
create function public.admin_catalog_detail(p_facility uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_facility public.facilities;
begin
  perform private.require_admin();
  select * into v_facility from public.facilities where id = p_facility;
  if v_facility.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'facility', to_jsonb(v_facility) - 'search_text',
    'fields', (select coalesce(jsonb_agg(to_jsonb(pi) || jsonb_build_object(
                        'operations', (select to_jsonb(o) - 'pitch_id' from public.pitch_operations o
                                       where o.pitch_id = pi.id),
                        'bookable', private.pitch_is_bookable(pi.id)) order by pi.created_at), '[]'::jsonb)
               from public.pitches pi where pi.facility_id = p_facility),
    'evidence', (select coalesce(jsonb_agg(jsonb_build_object(
                          'pitch_id', e.pitch_id, 'attribute', e.attribute, 'value', e.value,
                          'source_kind', e.source_kind, 'source_record_id', e.source_record_id,
                          'observed_at', e.observed_at, 'recorded_at', e.recorded_at)
                        order by e.recorded_at), '[]'::jsonb)
                 from public.pitch_evidence e
                 where e.facility_id = p_facility
                    or e.pitch_id in (select id from public.pitches where facility_id = p_facility)),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', s.id, 'source', s.source, 'key', s.source_key, 'licence', s.licence,
                         'needs_review', s.needs_review, 'gone_at', s.gone_at, 'pitch_id', s.pitch_id,
                         'raw', s.raw) order by s.created_at), '[]'::jsonb)
                from public.source_records s where s.facility_id = p_facility),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object(
                         'action', lr.action, 'pitch_id', lr.pitch_id, 'reason', lr.reason,
                         'reviewer', lr.reviewer, 'at', lr.created_at) order by lr.created_at desc),
                       '[]'::jsonb)
                from public.listing_reviews lr where lr.facility_id = p_facility),
    'badge_history', (select coalesce(jsonb_agg(jsonb_build_object(
                               'pitch_id', v.pitch_id, 'from', v.from_state, 'to', v.to_state,
                               'reason', v.reason, 'by', v.recorded_by, 'at', v.created_at)
                             order by v.created_at desc), '[]'::jsonb)
                      from public.verification_events v
                      where v.pitch_id in (select id from public.pitches where facility_id = p_facility)),
    'staff', (select coalesce(jsonb_agg(jsonb_build_object(
                       'user_id', st.user_id, 'name', pr.display_name, 'role', st.role,
                       'since', st.created_at)), '[]'::jsonb)
              from public.pitch_staff st join public.profiles pr on pr.id = st.user_id
              where st.facility_id = p_facility),
    'claims', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', cl.id, 'user_id', cl.user_id, 'name', pr.display_name,
                        'status', cl.status, 'evidence_paths', cl.evidence_paths,
                        'created_at', cl.created_at, 'decided_at', cl.decided_at)
                      order by cl.created_at desc), '[]'::jsonb)
               from public.facility_claims cl join public.profiles pr on pr.id = cl.user_id
               where cl.facility_id = p_facility),
    'contacts', (select coalesce(jsonb_agg(jsonb_build_object(
                          'id', ct.id, 'name', ct.name, 'phone', ct.phone, 'email', ct.email)), '[]'::jsonb)
                 from public.facility_contacts ct where ct.facility_id = p_facility),
    'outreach', (select coalesce(jsonb_agg(jsonb_build_object(
                          'channel', oa.channel, 'outcome', oa.outcome, 'note', oa.note,
                          'follow_up_on', oa.follow_up_on, 'at', oa.created_at)
                        order by oa.created_at desc), '[]'::jsonb)
                 from public.outreach_attempts oa where oa.facility_id = p_facility),
    'media', (select coalesce(jsonb_agg(jsonb_build_object(
                       'id', m.id, 'pitch_id', m.pitch_id, 'path', m.storage_path, 'rights', m.rights,
                       'attribution', m.attribution, 'source_url', m.source_url, 'status', m.status)
                     order by m.created_at), '[]'::jsonb)
              from public.pitch_media m where m.facility_id = p_facility),
    'reports', (select coalesce(jsonb_agg(private.report_json(r) order by r.created_at desc), '[]'::jsonb)
                from public.community_submissions r where r.facility_id = p_facility));
end;
$$;

revoke execute on function public.admin_catalog_summary(), public.admin_catalog_listings(jsonb),
  public.admin_catalog_detail(uuid) from public, anon;
grant execute on function public.admin_catalog_summary(), public.admin_catalog_listings(jsonb),
  public.admin_catalog_detail(uuid) to authenticated, service_role;

revoke execute on all functions in schema private from public;
