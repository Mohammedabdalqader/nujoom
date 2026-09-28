-- D1b part 2a: player reports about the catalog and operator outreach records (D-048; contract
-- §2.4, §3, §6, §8). Reports are structured (no free text except a missing pitch's name, which
-- is moderated and never shown before review), rate-limited and visible to the reporter and
-- admins only. Outreach is admin-only; contacting an operator never changes the badge, and an
-- opt-out deletes their contacts and ends verification at once.

create type public.report_kind as enum ('missing_pitch', 'closed', 'wrong_details', 'wrong_location', 'duplicate');
create type public.report_status as enum ('pending', 'accepted', 'rejected');
create type public.outreach_channel as enum ('phone', 'visit', 'whatsapp', 'email');
create type public.outreach_outcome as enum
  ('no_answer', 'interested', 'declined', 'opted_out', 'wrong_contact', 'agreed');

-- ---------------------------------------------------------------------------
-- Player reports
-- ---------------------------------------------------------------------------
create table public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Anonymised when the reporter deletes their account; the report itself stays.
  user_id uuid references public.profiles (id) on delete set null,
  kind public.report_kind not null,
  facility_id uuid references public.facilities (id) on delete cascade,
  pitch_id uuid references public.pitches (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 2048),
  status public.report_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reason text check (reason ~ '^[a-z][a-z0-9_]{1,40}$'),
  created_at timestamptz not null default now(),
  check (kind = 'missing_pitch' or num_nonnulls(facility_id, pitch_id) >= 1)
);
create index community_submissions_status_idx on public.community_submissions (status, created_at);
create index community_submissions_user_idx on public.community_submissions (user_id);

-- ---------------------------------------------------------------------------
-- Operator outreach (admins only)
-- ---------------------------------------------------------------------------
create table public.facility_contacts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name text check (char_length(name) between 2 and 80),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_by uuid,
  created_at timestamptz not null default now(),
  check (num_nonnulls(phone, email) >= 1)
);
create index facility_contacts_facility_idx on public.facility_contacts (facility_id);

create table public.outreach_attempts (
  id bigint generated always as identity primary key,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  channel public.outreach_channel not null,
  outcome public.outreach_outcome not null,
  -- Internal staff note; never shown to players.
  note text check (char_length(note) <= 500),
  follow_up_on date,
  staff uuid,
  created_at timestamptz not null default now()
);
create index outreach_attempts_facility_idx on public.outreach_attempts (facility_id, created_at desc);
create trigger outreach_attempts_append_only before update on public.outreach_attempts
  for each row execute function private.prevent_modification();

alter table public.community_submissions enable row level security;
alter table public.facility_contacts enable row level security;
alter table public.outreach_attempts enable row level security;
revoke all on table public.community_submissions, public.facility_contacts, public.outreach_attempts
  from anon, authenticated;
grant all on table public.community_submissions, public.facility_contacts, public.outreach_attempts
  to service_role;

-- ---------------------------------------------------------------------------
-- Reports: submit, see your own, decide (admin)
-- ---------------------------------------------------------------------------
create function private.report_json(r public.community_submissions)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('id', r.id, 'kind', r.kind, 'facility_id', r.facility_id,
                            'pitch_id', r.pitch_id, 'payload', r.payload, 'status', r.status,
                            'created_at', r.created_at, 'reviewed_at', r.reviewed_at);
$$;

create function public.submit_catalog_report(p_kind public.report_kind, p_pitch uuid default null,
                                             p_facility uuid default null,
                                             p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_facility uuid := p_facility;
  v_key text;
  v_report public.community_submissions;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
  end if;

  -- The target must be something the reporter can see: a published field or facility.
  if p_pitch is not null then
    select p.facility_id into v_facility
    from public.pitches p join public.facilities f on f.id = p.facility_id
    where p.id = p_pitch and p.listing_state = 'published' and f.listing_state = 'published';
    if v_facility is null then
      raise exception 'not_found' using errcode = 'no_data_found';
    end if;
  elsif p_facility is not null and not exists (
          select 1 from public.facilities where id = p_facility and listing_state = 'published') then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;

  -- Structured payloads only (spec: no free text), validated per kind. Any value that doesn't
  -- parse (a bad size, surface, boolean or coordinate) is the same clear `invalid_report`.
  begin
  case p_kind
    when 'missing_pitch' then
      if p_pitch is not null or p_facility is not null
         or char_length(btrim(coalesce(v_payload ->> 'name', ''))) not between 2 and 80
         or not exists (select 1 from public.cities where id = (v_payload ->> 'city_id')::bigint)
         or exists (select 1 from jsonb_object_keys(v_payload) k
                    where k not in ('name', 'city_id', 'lat', 'lng', 'players_per_side')) then
        raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
      end if;
    when 'closed' then
      if v_facility is null or v_payload <> '{}'::jsonb then
        raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
      end if;
    when 'wrong_details' then
      if p_pitch is null or v_payload = '{}'::jsonb then
        raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
      end if;
      for v_key in select jsonb_object_keys(v_payload) loop
        if v_key not in ('players_per_side', 'surface', 'indoor', 'lights', 'futsal') then
          raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
        end if;
      end loop;
      -- Values must parse as the real columns would (a bad size or surface is refused here).
      perform jsonb_populate_record(null::public.pitches, v_payload);
    when 'wrong_location' then
      if v_facility is null or v_payload - 'lat' - 'lng' <> '{}'::jsonb
         or (v_payload ->> 'lat') is null or (v_payload ->> 'lng') is null then
        raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
      end if;
    when 'duplicate' then
      if v_facility is null or v_payload - 'duplicate_of' <> '{}'::jsonb
         or not exists (select 1 from public.facilities
                        where id = (v_payload ->> 'duplicate_of')::uuid and id <> v_facility) then
        raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
      end if;
  end case;
  if (v_payload ? 'lat') and not ((v_payload ->> 'lat')::double precision between 29 and 33.5
                                  and (v_payload ->> 'lng')::double precision between 34.8 and 39.5) then
    raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
  end if;
  if (v_payload ? 'players_per_side')
     and (v_payload ->> 'players_per_side')::integer not between 3 and 11 then
    raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
  end if;
  exception
    when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
      raise exception 'invalid_report' using errcode = 'invalid_parameter_value';
  end;

  if not private.hit_rate_limit('catalog_report:' || v_uid, interval '1 day', 5) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  insert into public.community_submissions (user_id, kind, facility_id, pitch_id, payload)
  values (v_uid, p_kind, v_facility, p_pitch, v_payload)
  returning * into v_report;
  return private.report_json(v_report);
end;
$$;

create function public.my_catalog_reports()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.report_json(r) order by r.created_at desc), '[]'::jsonb)
  from (select * from public.community_submissions
        where user_id = (select auth.uid()) order by created_at desc limit 50) r;
$$;

create function public.admin_catalog_reports(p_status public.report_status default 'pending',
                                             p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return (select coalesce(jsonb_agg(private.report_json(r) order by r.created_at), '[]'::jsonb)
          from (select * from public.community_submissions where status = p_status
                order by created_at limit least(greatest(p_limit, 1), 200)) r);
end;
$$;

-- Accepting a report records the decision; the fact changes themselves go through
-- admin_review_listing, with the report as their evidence.
create function public.admin_decide_report(p_report uuid, p_decision public.report_status,
                                           p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_report public.community_submissions;
begin
  if p_decision = 'pending' then
    raise exception 'invalid_action' using errcode = 'invalid_parameter_value';
  end if;
  update public.community_submissions
  set status = p_decision, reviewed_by = v_admin, reviewed_at = now(), reason = p_reason
  where id = p_report and status = 'pending'
  returning * into v_report;
  if v_report.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  perform private.write_audit('catalog.report_' || p_decision::text, 'report', p_report::text,
                              jsonb_build_object('reason', p_reason, 'kind', v_report.kind));
  return private.report_json(v_report);
end;
$$;

-- ---------------------------------------------------------------------------
-- Outreach (admins)
-- ---------------------------------------------------------------------------
create function public.admin_add_contact(p_facility uuid, p_name text, p_phone text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_id uuid;
begin
  if (select operator_state from public.facilities where id = p_facility) = 'opted_out' then
    raise exception 'operator_opted_out' using errcode = 'check_violation';
  end if;
  insert into public.facility_contacts (facility_id, name, phone, email, created_by)
  values (p_facility, nullif(btrim(p_name), ''), nullif(btrim(p_phone), ''),
          lower(nullif(btrim(p_email), '')), v_admin)
  returning id into v_id;
  perform private.write_audit('catalog.contact_added', 'facility', p_facility::text);
  return v_id;
end;
$$;

-- Records an attempt and moves the operator state forward (contract §3). Contacting never
-- changes a badge; an opt-out deletes the contacts and ends verification immediately.
create function public.admin_log_outreach(p_facility uuid, p_channel public.outreach_channel,
                                          p_outcome public.outreach_outcome,
                                          p_note text default null, p_follow_up date default null)
returns public.operator_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_state public.operator_state;
  v_next public.operator_state;
  v_pitch uuid;
begin
  select operator_state into v_state from public.facilities where id = p_facility for update;
  if v_state is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_state = 'opted_out' then
    raise exception 'operator_opted_out' using errcode = 'check_violation';
  end if;
  insert into public.outreach_attempts (facility_id, channel, outcome, note, follow_up_on, staff)
  values (p_facility, p_channel, p_outcome, p_note, p_follow_up, v_admin);

  v_next := case
    when p_outcome = 'opted_out' then 'opted_out'
    when v_state in ('claimed', 'authority_verified') then v_state -- outreach never undoes a claim
    when p_outcome = 'declined' then 'declined'
    when p_outcome in ('interested', 'agreed') then 'responded'
    when v_state = 'none' then 'contacted'
    else v_state end;

  if v_next <> v_state then
    update public.facilities set operator_state = v_next where id = p_facility;
  end if;
  if p_outcome = 'opted_out' then
    delete from public.facility_contacts where facility_id = p_facility;
    for v_pitch in select id from public.pitches
                   where facility_id = p_facility and participation = 'verified' loop
      update public.pitches set participation = 'not_verified', verified_at = null where id = v_pitch;
      insert into public.verification_events (pitch_id, from_state, to_state, reason, recorded_by)
      values (v_pitch, 'verified', 'not_verified', 'operator_opted_out', v_admin);
    end loop;
  end if;
  perform private.write_audit('catalog.outreach_' || p_outcome::text, 'facility', p_facility::text,
                              jsonb_build_object('from', v_state, 'to', v_next));
  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- The data export covers a player's reports (coverage guard, 050-data-requests.sql).
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
    'pitch_reports', (select coalesce(jsonb_agg(jsonb_build_object(
                        'kind', r.kind, 'payload', r.payload, 'status', r.status,
                        'created_at', r.created_at) order by r.created_at), '[]'::jsonb)
                      from public.community_submissions r where r.user_id = p_user),
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
revoke execute on function public.submit_catalog_report(public.report_kind, uuid, uuid, jsonb),
  public.my_catalog_reports(), public.admin_catalog_reports(public.report_status, integer),
  public.admin_decide_report(uuid, public.report_status, text),
  public.admin_add_contact(uuid, text, text, text),
  public.admin_log_outreach(uuid, public.outreach_channel, public.outreach_outcome, text, date)
  from public, anon;
grant execute on function public.submit_catalog_report(public.report_kind, uuid, uuid, jsonb),
  public.my_catalog_reports(), public.admin_catalog_reports(public.report_status, integer),
  public.admin_decide_report(uuid, public.report_status, text),
  public.admin_add_contact(uuid, text, text, text),
  public.admin_log_outreach(uuid, public.outreach_channel, public.outreach_outcome, text, date)
  to authenticated, service_role;
revoke execute on function public.export_user_data(uuid) from public, anon, authenticated;
grant execute on function public.export_user_data(uuid) to service_role;

revoke execute on all functions in schema private from public;
