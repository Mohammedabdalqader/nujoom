-- D1b part 1: the catalog's write side for the verification lifecycle (D-046; contract §2.4,
-- §3, §6). Admins create, review and publish listings, decide ownership claims and verify an
-- operator's authority; the badge changes only through admin_set_participation. Staff of a
-- claimed facility confirm field facts and prices and stage their schedule privately; nothing
-- becomes public or bookable before the badge (D1a gate). Every change is recorded
-- (listing_reviews / verification_events) and audited.
-- Part 2 adds outreach contacts, community reports and photos; D2 the import.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('owner', 'staff');
create type public.claim_status as enum ('submitted', 'evidence_requested', 'approved', 'rejected', 'withdrawn');

-- Who runs a facility in the app (owner dashboard later). Removed with the account.
create table public.pitch_staff (
  facility_id uuid not null references public.facilities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (facility_id, user_id)
);
create index pitch_staff_user_idx on public.pitch_staff (user_id);

-- "This is my venue": approval makes the person staff and the facility `claimed`, never the
-- badge. Withdrawn with the account (cascade).
create table public.facility_claims (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.claim_status not null default 'submitted',
  -- Private storage paths of the evidence (a licence, a lease); reviewed by admins only.
  evidence_paths text[] not null default '{}' check (cardinality(evidence_paths) <= 5),
  decided_by uuid,
  decided_at timestamptz,
  reason text check (reason ~ '^[a-z][a-z0-9_]{1,40}$'),
  created_at timestamptz not null default now()
);
create unique index facility_claims_one_open_idx on public.facility_claims (facility_id, user_id)
  where status in ('submitted', 'evidence_requested');

-- Append-only records of every reviewer decision and every badge change.
create table public.listing_reviews (
  id bigint generated always as identity primary key,
  facility_id uuid references public.facilities (id) on delete cascade,
  pitch_id uuid references public.pitches (id) on delete cascade,
  action text not null check (action ~ '^[a-z][a-z_]{2,40}$'),
  before jsonb,
  after jsonb,
  reason text check (reason ~ '^[a-z][a-z0-9_]{1,40}$'),
  reviewer uuid, -- audit reference, no foreign key
  created_at timestamptz not null default now(),
  check (num_nonnulls(facility_id, pitch_id) >= 1)
);
create index listing_reviews_facility_idx on public.listing_reviews (facility_id);
create index listing_reviews_pitch_idx on public.listing_reviews (pitch_id);

create table public.verification_events (
  id bigint generated always as identity primary key,
  pitch_id uuid not null references public.pitches (id) on delete cascade,
  from_state public.pitch_participation not null,
  to_state public.pitch_participation not null,
  reason text check (reason ~ '^[a-z][a-z0-9_]{1,40}$'),
  evidence jsonb not null default '{}'::jsonb,
  recorded_by uuid, -- null = the scheduled freshness job (later)
  created_at timestamptz not null default now(),
  check (from_state <> to_state)
);
create index verification_events_pitch_idx on public.verification_events (pitch_id);

create trigger listing_reviews_append_only before update on public.listing_reviews
  for each row execute function private.prevent_modification();
create trigger verification_events_append_only before update on public.verification_events
  for each row execute function private.prevent_modification();

alter table public.pitch_staff enable row level security;
alter table public.facility_claims enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.verification_events enable row level security;
revoke all on table public.pitch_staff, public.facility_claims, public.listing_reviews,
  public.verification_events from anon, authenticated;
grant all on table public.pitch_staff, public.facility_claims, public.listing_reviews,
  public.verification_events to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  return (select auth.uid());
end;
$$;

create function private.is_facility_staff(p_facility uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pitch_staff
                 where facility_id = p_facility and user_id = (select auth.uid()));
$$;

-- Design facts an admin or operator may set, and the evidence each change leaves behind.
create function private.apply_pitch_facts(p_pitch uuid, p_facts jsonb, p_source public.evidence_source)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed constant text[] := array['label_ar', 'label_en', 'players_per_side', 'futsal', 'length_m',
                                     'width_m', 'surface', 'indoor', 'lights', 'amenities'];
  v_facts jsonb := coalesce(p_facts, '{}'::jsonb);
  v_key text;
  v_old public.pitches;
  v_new public.pitches;
begin
  for v_key in select jsonb_object_keys(v_facts) loop
    if not v_key = any (v_allowed) then
      raise exception 'invalid_fact' using errcode = 'invalid_parameter_value';
    end if;
  end loop;
  select * into v_old from public.pitches where id = p_pitch for update;
  v_new := jsonb_populate_record(v_old, v_facts);
  update public.pitches
  set label_ar = v_new.label_ar, label_en = v_new.label_en,
      players_per_side = v_new.players_per_side, futsal = v_new.futsal,
      length_m = v_new.length_m, width_m = v_new.width_m, surface = v_new.surface,
      indoor = v_new.indoor, lights = v_new.lights, amenities = v_new.amenities
  where id = p_pitch;
  insert into public.pitch_evidence (pitch_id, attribute, value, source_kind, recorded_by)
  select p_pitch, key, value, p_source, (select auth.uid()) from jsonb_each(v_facts);
end;
$$;

create function private.apply_facility_facts(p_facility uuid, p_facts jsonb, p_source public.evidence_source)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed constant text[] := array['name_ar', 'name_en', 'neighborhood_id', 'address_ar', 'address_en',
                                     'lat', 'lng', 'location_confidence', 'access'];
  v_facts jsonb := coalesce(p_facts, '{}'::jsonb);
  v_key text;
  v_old public.facilities;
  v_new public.facilities;
begin
  for v_key in select jsonb_object_keys(v_facts) loop
    if not v_key = any (v_allowed) then
      raise exception 'invalid_fact' using errcode = 'invalid_parameter_value';
    end if;
  end loop;
  select * into v_old from public.facilities where id = p_facility for update;
  v_new := jsonb_populate_record(v_old, v_facts);
  update public.facilities
  set name_ar = v_new.name_ar, name_en = v_new.name_en, neighborhood_id = v_new.neighborhood_id,
      address_ar = v_new.address_ar, address_en = v_new.address_en, lat = v_new.lat, lng = v_new.lng,
      location_confidence = v_new.location_confidence, access = v_new.access,
      last_reviewed_at = now()
  where id = p_facility;
  insert into public.pitch_evidence (facility_id, attribute, value, source_kind, recorded_by)
  select p_facility, key, value, p_source, (select auth.uid()) from jsonb_each(v_facts);
end;
$$;

create function private.review(p_facility uuid, p_pitch uuid, p_action text, p_before jsonb,
                               p_after jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.listing_reviews (facility_id, pitch_id, action, before, after, reason, reviewer)
  values (p_facility, p_pitch, p_action, p_before, p_after, p_reason, (select auth.uid()));
  perform private.write_audit('catalog.' || p_action,
                              case when p_pitch is null then 'facility' else 'pitch' end,
                              coalesce(p_pitch, p_facility)::text,
                              jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: listings
-- ---------------------------------------------------------------------------

-- A candidate facility and its fields from reviewed sources. `p_source` says where the facts
-- came from (osm, field_team, reviewer, …); nothing is published here.
create function public.admin_create_listing(p_facility jsonb, p_pitches jsonb,
                                            p_source public.evidence_source default 'reviewer')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_pitch uuid;
  v_facts jsonb;
begin
  perform private.require_admin();
  if jsonb_typeof(p_pitches) <> 'array' or jsonb_array_length(p_pitches) = 0 then
    raise exception 'invalid_listing' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.facilities (city_id) values ((p_facility ->> 'city_id')::bigint)
  returning id into v_facility;
  perform private.apply_facility_facts(v_facility, p_facility - 'city_id', p_source);
  for v_facts in select value from jsonb_array_elements(p_pitches) loop
    insert into public.pitches (facility_id) values (v_facility) returning id into v_pitch;
    perform private.apply_pitch_facts(v_pitch, v_facts, p_source);
  end loop;
  perform private.review(v_facility, null, 'create', null, p_facility, null);
  return v_facility;
end;
$$;

-- Every listing-state change and every reviewed fact change. Targets a facility or a pitch.
--   publish | hide | mark_closed | reject | mark_duplicate {duplicate_of} | update_facts {facts}
create function public.admin_review_listing(p_target text, p_id uuid, p_action text,
                                            p_patch jsonb default '{}'::jsonb,
                                            p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.listing_state;
  v_before jsonb;
  v_facility uuid;
begin
  perform private.require_admin();
  if p_target not in ('facility', 'pitch')
     or p_action not in ('publish', 'hide', 'mark_closed', 'reject', 'mark_duplicate', 'update_facts') then
    raise exception 'invalid_action' using errcode = 'invalid_parameter_value';
  end if;

  if p_target = 'facility' then
    select to_jsonb(f) - 'search_text', f.id into v_before, v_facility
    from public.facilities f where f.id = p_id for update;
  else
    select to_jsonb(p), p.facility_id into v_before, v_facility
    from public.pitches p where p.id = p_id for update;
  end if;
  if v_before is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;

  if p_action = 'update_facts' then
    if p_target = 'facility' then
      perform private.apply_facility_facts(p_id, p_patch -> 'facts', 'reviewer');
    else
      perform private.apply_pitch_facts(p_id, p_patch -> 'facts', 'reviewer');
    end if;
  else
    v_state := case p_action when 'publish' then 'published' when 'hide' then 'hidden'
                             when 'mark_closed' then 'closed' when 'reject' then 'rejected'
                             else 'duplicate' end;
    if p_target = 'facility' then
      if p_action = 'publish' and exists (
           select 1 from public.facilities
           where id = p_id and (access not in ('public_rental', 'public_free')
                                or coalesce(name_ar, name_en) is null)) then
        raise exception 'access_not_public' using errcode = 'check_violation';
      end if;
      if p_action = 'mark_duplicate' and (p_patch ->> 'duplicate_of') is null then
        raise exception 'duplicate_of_required' using errcode = 'invalid_parameter_value';
      end if;
      update public.facilities
      set listing_state = v_state, last_reviewed_at = now(),
          duplicate_of = case when p_action = 'mark_duplicate'
                              then (p_patch ->> 'duplicate_of')::uuid else duplicate_of end
      where id = p_id;
    else
      if p_action = 'mark_duplicate' then
        raise exception 'invalid_action' using errcode = 'invalid_parameter_value';
      end if;
      update public.pitches set listing_state = v_state where id = p_id;
    end if;
  end if;

  perform private.review(v_facility, case when p_target = 'pitch' then p_id end, p_action, v_before,
                         p_patch, p_reason);
  return jsonb_build_object('target', p_target, 'id', p_id, 'action', p_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- Claims and authority
-- ---------------------------------------------------------------------------

-- An adult says "I run this venue". One open claim per person and facility; 3 a day.
create function public.claim_facility(p_facility uuid, p_evidence_paths text[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claim uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and not is_youth) then
    raise exception 'not_adult' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.facilities
                 where id = p_facility and listing_state in ('candidate', 'published', 'hidden')) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.pitch_staff where facility_id = p_facility and user_id = v_uid) then
    raise exception 'already_staff' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from unnest(coalesce(p_evidence_paths, '{}')) e
             where e not like v_uid::text || '/%' or e ~ '\.\.') then
    raise exception 'invalid_evidence' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('claim:' || v_uid, interval '1 day', 3) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  insert into public.facility_claims (facility_id, user_id, evidence_paths)
  values (p_facility, v_uid, coalesce(p_evidence_paths, '{}'))
  on conflict (facility_id, user_id) where status in ('submitted', 'evidence_requested') do nothing
  returning id into v_claim;
  if v_claim is null then
    raise exception 'claim_exists' using errcode = 'unique_violation';
  end if;
  perform private.write_audit('catalog.claim_submitted', 'facility', p_facility::text);
  return v_claim;
end;
$$;

-- Approve → the person becomes the facility's owner and the facility `claimed`. The badge is
-- untouched: a claim is not verified authority.
create function public.admin_decide_claim(p_claim uuid, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_claim public.facility_claims;
begin
  if p_decision not in ('approve', 'reject', 'request_evidence') then
    raise exception 'invalid_action' using errcode = 'invalid_parameter_value';
  end if;
  update public.facility_claims
  set status = case p_decision when 'approve' then 'approved'::public.claim_status
                               when 'reject' then 'rejected'::public.claim_status
                               else 'evidence_requested'::public.claim_status end,
      decided_by = v_admin, decided_at = now(), reason = p_reason
  where id = p_claim and status in ('submitted', 'evidence_requested')
  returning * into v_claim;
  if v_claim.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if p_decision = 'approve' then
    insert into public.pitch_staff (facility_id, user_id, role)
    values (v_claim.facility_id, v_claim.user_id, 'owner')
    on conflict do nothing;
    update public.facilities set operator_state = 'claimed'
    where id = v_claim.facility_id
      and operator_state in ('none', 'contacted', 'responded', 'declined');
  end if;
  perform private.review(v_claim.facility_id, null, 'claim_' || p_decision, null,
                         jsonb_build_object('claim', p_claim), p_reason);
  return jsonb_build_object('claim', p_claim, 'status', v_claim.status);
end;
$$;

-- The operator proved authority over the facility (reviewed evidence). Only from `claimed`.
create function public.admin_verify_authority(p_facility uuid, p_evidence jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.facilities set operator_state = 'authority_verified', last_reviewed_at = now()
  where id = p_facility and operator_state = 'claimed';
  if not found then
    raise exception 'operator_not_claimed' using errcode = 'check_violation';
  end if;
  perform private.review(p_facility, null, 'verify_authority', null, p_evidence, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Operators (staff of a claimed facility)
-- ---------------------------------------------------------------------------

-- Operator-confirmed facts and operations. Operations may be created while not verified; the
-- schedule stays inactive until the operator switches it on, and nothing is public before the badge.
create function public.owner_confirm_field(p_pitch uuid, p_facts jsonb default '{}'::jsonb,
                                           p_operations jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
begin
  if v_facility is null or not private.is_facility_staff(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  perform private.apply_pitch_facts(p_pitch, p_facts, 'operator');
  if p_operations is not null then
    insert into public.pitch_operations (pitch_id, price_per_hour, price_note_ar, price_note_en,
                                         slot_minutes, opening_hours, confirmed_by, confirmed_at)
    values (p_pitch, (p_operations ->> 'price_per_hour')::numeric, p_operations ->> 'price_note_ar',
            p_operations ->> 'price_note_en', (p_operations ->> 'slot_minutes')::smallint,
            coalesce(p_operations -> 'opening_hours', '{}'::jsonb), (select auth.uid()), now())
    on conflict (pitch_id) do update
    set price_per_hour = excluded.price_per_hour, price_note_ar = excluded.price_note_ar,
        price_note_en = excluded.price_note_en, slot_minutes = excluded.slot_minutes,
        opening_hours = excluded.opening_hours, confirmed_by = excluded.confirmed_by,
        confirmed_at = now();
  end if;
  perform private.review(v_facility, p_pitch, 'operator_confirmed', null,
                         jsonb_build_object('facts', p_facts, 'operations', p_operations), null);
end;
$$;

create function public.owner_set_schedule_active(p_pitch uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
begin
  if v_facility is null or not private.is_facility_staff(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  update public.pitch_operations set schedule_active = p_active where pitch_id = p_pitch;
  if not found then
    raise exception 'no_operations' using errcode = 'no_data_found';
  end if;
  perform private.review(v_facility, p_pitch, case when p_active then 'schedule_on' else 'schedule_off' end,
                         null, null, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- The badge (the only writer; the D1a trigger re-checks authority and an active schedule)
-- ---------------------------------------------------------------------------
create function public.admin_set_participation(p_pitch uuid, p_to public.pitch_participation,
                                               p_reason text, p_evidence jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.pitch_participation;
begin
  perform private.require_admin();
  select participation into v_from from public.pitches where id = p_pitch for update;
  if v_from is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_from = p_to then
    return;
  end if;
  update public.pitches
  set participation = p_to,
      verified_at = case when p_to = 'verified' then now() end
  where id = p_pitch;
  insert into public.verification_events (pitch_id, from_state, to_state, reason, evidence, recorded_by)
  values (p_pitch, v_from, p_to, p_reason, coalesce(p_evidence, '{}'::jsonb), (select auth.uid()));
  perform private.write_audit('catalog.participation_' || p_to::text, 'pitch', p_pitch::text,
                              jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- The data export covers the new personal records (coverage guard, 050-data-requests.sql).
-- ---------------------------------------------------------------------------
create or replace function public.export_user_data(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'format', 'nujoom-data-export',
    'format_version', 1,
    'generated_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
                from auth.users u where u.id = p_user),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = p_user),
    'date_of_birth', (select pp.dob from public.profile_private pp where pp.user_id = p_user),
    'settings', (select to_jsonb(s) - 'user_id' from public.user_settings s where s.user_id = p_user),
    'consents', (select coalesce(jsonb_agg(jsonb_build_object(
                   'type', c.type, 'version', c.version, 'granted', c.granted,
                   'given_by_guardian', c.given_by is not null and c.given_by <> c.user_id,
                   'created_at', c.created_at) order by c.created_at), '[]'::jsonb)
                 from public.consents c where c.user_id = p_user),
    'guardians_named', (select coalesce(jsonb_agg(jsonb_build_object(
                          'contact_email', g.contact_email, 'status', g.status,
                          'visibility_choice', g.visibility_choice, 'created_at', g.created_at,
                          'confirmed_at', g.confirmed_at) order by g.created_at), '[]'::jsonb)
                        from public.guardians g where g.youth_user_id = p_user),
    'guardian_of', (select coalesce(jsonb_agg(jsonb_build_object(
                      'youth_display_name', y.display_name, 'status', g.status,
                      'confirmed_at', g.confirmed_at) order by g.created_at), '[]'::jsonb)
                    from public.guardians g join public.profiles y on y.id = g.youth_user_id
                    where g.guardian_user_id = p_user),
    'venues_managed', (select coalesce(jsonb_agg(jsonb_build_object(
                         'facility', coalesce(f.name_ar, f.name_en), 'role', s.role,
                         'since', s.created_at) order by s.created_at), '[]'::jsonb)
                       from public.pitch_staff s join public.facilities f on f.id = s.facility_id
                       where s.user_id = p_user),
    'venue_claims', (select coalesce(jsonb_agg(jsonb_build_object(
                       'facility', coalesce(f.name_ar, f.name_en), 'status', c.status,
                       'created_at', c.created_at, 'decided_at', c.decided_at) order by c.created_at),
                       '[]'::jsonb)
                     from public.facility_claims c join public.facilities f on f.id = c.facility_id
                     where c.user_id = p_user),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
                 'name', e.name, 'properties', e.properties, 'created_at', e.created_at)
                 order by e.created_at), '[]'::jsonb)
               from public.events e where e.user_id = p_user),
    'data_requests', (select coalesce(jsonb_agg(private.data_request_json(r) order by r.requested_at),
                                      '[]'::jsonb)
                      from public.data_requests r where r.user_id = p_user)
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_create_listing(jsonb, jsonb, public.evidence_source),
  public.admin_review_listing(text, uuid, text, jsonb, text),
  public.claim_facility(uuid, text[]), public.admin_decide_claim(uuid, text, text),
  public.admin_verify_authority(uuid, jsonb), public.owner_confirm_field(uuid, jsonb, jsonb),
  public.owner_set_schedule_active(uuid, boolean),
  public.admin_set_participation(uuid, public.pitch_participation, text, jsonb)
  from public, anon;
grant execute on function public.admin_create_listing(jsonb, jsonb, public.evidence_source),
  public.admin_review_listing(text, uuid, text, jsonb, text),
  public.claim_facility(uuid, text[]), public.admin_decide_claim(uuid, text, text),
  public.admin_verify_authority(uuid, jsonb), public.owner_confirm_field(uuid, jsonb, jsonb),
  public.owner_set_schedule_active(uuid, boolean),
  public.admin_set_participation(uuid, public.pitch_participation, text, jsonb)
  to authenticated, service_role;
revoke execute on function public.export_user_data(uuid) from public, anon, authenticated;
grant execute on function public.export_user_data(uuid) to service_role;

revoke execute on all functions in schema private from public;
