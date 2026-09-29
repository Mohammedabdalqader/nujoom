-- Booking transactions, part 1 (D-071): the contract in agentic_system/contracts/booking.md (D-070).
-- One table for app bookings, manual (phone/walk-in) bookings and staff blocks, under one exclusion
-- constraint, so nothing can ever overlap on a field. No money moves: bookings are paid in cash at
-- the pitch; the receipt keeps the price as it was when booked.

insert into public.config (key, value, description) values
  ('booking', '{"horizon_days": 14, "max_upcoming": 3, "busy_window_days": 15, "block_horizon_days": 90}',
   'Booking limits (contract §3): bookable days from today, upcoming app bookings per organizer, the longest availability window a client may ask for, and how far ahead staff may block.');

create type public.booking_kind as enum ('app', 'manual', 'block');
create type public.booking_status as enum ('confirmed', 'cancelled');
create type public.booking_cancel_reason as enum
  ('organizer', 'venue_closed', 'weather', 'maintenance', 'staff_other', 'admin', 'account_deleted');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  -- Venues are closed, not deleted; deleting one (admin clean-up, tests) takes its bookings along.
  pitch_id uuid not null references public.pitches (id) on delete cascade,
  kind public.booking_kind not null,
  status public.booking_status not null default 'confirmed',
  during tstzrange not null check (not isempty(during) and not lower_inf(during) and not upper_inf(during)
                                   and lower_inc(during) and not upper_inc(during)),
  -- The app organizer; null for manual bookings and blocks, and after the organizer's account is gone.
  organizer_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  recorded boolean not null default true,
  team_a_name text check (char_length(team_a_name) between 1 and 30),
  team_b_name text check (char_length(team_b_name) between 1 and 30),
  -- The receipt: price and slot length as confirmed when booked (never rewritten later).
  price_per_hour numeric(6, 2),
  slot_minutes smallint,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid, -- audit reference, no foreign key
  cancel_reason public.booking_cancel_reason,
  check (kind = 'app' or organizer_id is null),
  check ((status = 'cancelled') = (cancelled_at is not null and cancel_reason is not null)),
  check (kind = 'block' or (price_per_hour is not null and slot_minutes is not null)),
  constraint bookings_no_overlap exclude using gist (pitch_id with =, during with &&)
    where (status = 'confirmed')
);
create unique index bookings_request_idx on public.bookings (created_by, client_request_id)
  where client_request_id is not null;
create index bookings_pitch_idx on public.bookings (pitch_id, lower(during));
create index bookings_organizer_idx on public.bookings (organizer_id) where organizer_id is not null;

-- Contact details: the venue's staff and the organizer only.
create table public.booking_private (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  walk_in_name text check (char_length(walk_in_name) between 1 and 60)
);

create table public.booking_players (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team text check (team in ('a', 'b')),
  bib smallint check (bib between 1 and 12),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid, -- audit reference, no foreign key
  primary key (booking_id, user_id)
);
create unique index booking_players_bib_idx on public.booking_players (booking_id, bib)
  where bib is not null and removed_at is null;
create index booking_players_user_idx on public.booking_players (user_id);

alter table public.bookings enable row level security;
alter table public.booking_private enable row level security;
alter table public.booking_players enable row level security;
revoke all on table public.bookings, public.booking_private, public.booking_players from anon, authenticated;
grant all on table public.bookings, public.booking_private, public.booking_players to service_role;

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

-- A verified field must also have a known size: capacity depends on it (contract §1).
create or replace function private.check_pitch_participation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.participation = 'verified'
     and (tg_op = 'INSERT' or old.participation is distinct from 'verified') then
    if not exists (select 1 from public.facilities f
                   where f.id = new.facility_id and f.operator_state = 'authority_verified') then
      raise exception 'operator_not_verified' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.pitch_operations o
                   where o.pitch_id = new.id and o.schedule_active) then
      raise exception 'schedule_not_active' using errcode = 'check_violation';
    end if;
    if new.players_per_side is null then
      raise exception 'size_unknown' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create function private.hhmm_minutes(p text)
returns integer
language sql
immutable
set search_path = ''
as $$ select split_part(p, ':', 1)::integer * 60 + split_part(p, ':', 2)::integer $$;

-- Why a stretch of time can't be booked on a field, or null when it can (contract §3; mirrors
-- generateSlots in @nujoom/shared). `p_minutes` is one slot for bookings, a whole number of slots
-- for staff blocks. Each opening range starts its own grid; nothing crosses midnight.
create function private.slot_error(p_pitch uuid, p_start timestamptz, p_minutes integer,
                                   p_kind public.booking_kind)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := (select value from public.config where key = 'booking');
  v_ops public.pitch_operations;
  v_local timestamp := p_start at time zone 'Asia/Amman';
  v_date date := (p_start at time zone 'Asia/Amman')::date;
  v_start integer;
  v_day text;
  v_range jsonb;
  v_open integer;
  v_close integer;
  v_horizon integer;
begin
  if not private.pitch_is_bookable(p_pitch)
     or (select players_per_side from public.pitches where id = p_pitch) is null then
    return 'pitch_unavailable';
  end if;
  select * into v_ops from public.pitch_operations where pitch_id = p_pitch;
  if p_start is null or p_start <= now() then
    return 'slot_in_past';
  end if;
  v_horizon := case when p_kind = 'block' then (v_cfg ->> 'block_horizon_days')::integer
                    else (v_cfg ->> 'horizon_days')::integer end;
  if v_date > private.amman_today() + v_horizon - 1 then
    return 'beyond_horizon';
  end if;
  if extract(second from v_local) <> 0 or p_minutes is null or p_minutes <= 0
     or p_minutes % v_ops.slot_minutes <> 0
     or (p_kind <> 'block' and p_minutes <> v_ops.slot_minutes) then
    return 'invalid_slot';
  end if;
  v_start := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
  v_day := (array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[extract(dow from v_date)::integer + 1];
  for v_range in select value from jsonb_array_elements(coalesce(v_ops.opening_hours -> v_day, '[]'::jsonb)) loop
    v_open := private.hhmm_minutes(v_range ->> 0);
    v_close := private.hhmm_minutes(v_range ->> 1);
    if v_start >= v_open and v_start + p_minutes <= v_close
       and (v_start - v_open) % v_ops.slot_minutes = 0 then
      return null;
    end if;
  end loop;
  return 'invalid_slot';
end;
$$;

-- Who may see a booking: its organizer, its current players, and the venue's staff.
create function private.can_see_booking(p_booking uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    join public.pitches p on p.id = b.pitch_id
    where b.id = p_booking
      and (b.organizer_id = (select auth.uid())
           or private.is_facility_staff(p.facility_id)
           or exists (select 1 from public.booking_players bp
                      where bp.booking_id = b.id and bp.user_id = (select auth.uid())
                        and bp.removed_at is null)));
$$;

-- The receipt (contract §4): venue and field, Amman times as instants, the price as booked,
-- cash at the pitch. No people.
create function private.booking_receipt(p_booking uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'kind', b.kind,
    'status', b.status,
    'starts_at', lower(b.during),
    'ends_at', upper(b.during),
    'venue', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
    'field', case when p.label_ar is null and p.label_en is null then null
                  else jsonb_build_object('ar', p.label_ar, 'en', p.label_en) end,
    'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en) from public.cities c where c.id = f.city_id),
    'pitch_id', p.id,
    'facility_id', f.id,
    'players_per_side', p.players_per_side,
    'slot_minutes', b.slot_minutes,
    'price_per_hour', b.price_per_hour,
    'total', case when b.price_per_hour is null then null
                  else round(b.price_per_hour * b.slot_minutes / 60.0, 2) end,
    'currency', 'JOD',
    'payment', 'cash_at_pitch',
    'recorded', b.recorded,
    'team_a_name', b.team_a_name,
    'team_b_name', b.team_b_name,
    'is_organizer', b.organizer_id = (select auth.uid()),
    'cancelled_at', b.cancelled_at,
    'cancel_reason', b.cancel_reason)
  from public.bookings b
  join public.pitches p on p.id = b.pitch_id
  join public.facilities f on f.id = p.facility_id
  where b.id = p_booking;
$$;

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

-- Taken time on a bookable field: ranges only, never who, what kind, or how many.
create function public.pitch_busy_ranges(p_pitch uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := (select (value ->> 'busy_window_days')::integer from public.config where key = 'booking');
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > make_interval(days => v_days) then
    raise exception 'invalid_window' using errcode = 'invalid_parameter_value';
  end if;
  if not private.pitch_is_bookable(p_pitch) then
    raise exception 'pitch_unavailable' using errcode = 'check_violation';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('starts_at', lower(b.during), 'ends_at', upper(b.during))
                                    order by lower(b.during)), '[]'::jsonb)
          from public.bookings b
          where b.pitch_id = p_pitch and b.status = 'confirmed'
            and b.during && tstzrange(p_from, p_to, '[)'));
end;
$$;

create function public.create_booking(p_pitch uuid, p_starts_at timestamptz, p_recorded boolean default true,
                                      p_team_a text default null, p_team_b text default null,
                                      p_contact_phone text default null, p_client_request_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cfg jsonb := (select value from public.config where key = 'booking');
  v_existing uuid;
  v_ops public.pitch_operations;
  v_error text;
  v_id uuid;
  v_team_a text := nullif(regexp_replace(btrim(coalesce(p_team_a, '')), '\s+', ' ', 'g'), '');
  v_team_b text := nullif(regexp_replace(btrim(coalesce(p_team_b, '')), '\s+', ' ', 'g'), '');
  v_phone text := nullif(btrim(coalesce(p_contact_phone, '')), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  -- One organizer at a time: keeps the upcoming-bookings limit exact under concurrency.
  perform pg_advisory_xact_lock(hashtext('booking_organizer:' || v_uid::text));
  -- A retry of the same request returns what it already made (contract §6).
  if p_client_request_id is not null then
    select id into v_existing from public.bookings
    where created_by = v_uid and client_request_id = p_client_request_id;
    if v_existing is not null then
      return private.booking_receipt(v_existing);
    end if;
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p_recorded, true) and not private.can_join_recorded_matches(v_uid) then
    if private.is_youth(v_uid)
       and not exists (select 1 from public.guardians g where g.youth_user_id = v_uid and g.status = 'confirmed') then
      raise exception 'guardian_required' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'recording_consent_required' using errcode = 'insufficient_privilege';
  end if;
  if (v_team_a is not null and char_length(v_team_a) > 30) or (v_team_b is not null and char_length(v_team_b) > 30) then
    raise exception 'invalid_team_name' using errcode = 'check_violation';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid_phone' using errcode = 'check_violation';
  end if;
  select * into v_ops from public.pitch_operations where pitch_id = p_pitch;
  v_error := private.slot_error(p_pitch, p_starts_at, v_ops.slot_minutes, 'app');
  if v_error is not null then
    raise exception '%', v_error using errcode = 'check_violation';
  end if;
  if (select count(*) from public.bookings
      where organizer_id = v_uid and kind = 'app' and status = 'confirmed' and upper(during) > now())
     >= (v_cfg ->> 'max_upcoming')::integer then
    raise exception 'too_many_bookings' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('booking:' || v_uid, interval '1 hour', 20) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  -- One booking at a time per field. Without it, two sessions inserting the same hour can each
  -- wait on the other's uncommitted row in the exclusion index and one is killed as a deadlock
  -- (found by tools/db-test/races.mjs). Lock order is always organizer, then field.
  perform pg_advisory_xact_lock(hashtext('booking_pitch:' || p_pitch::text));
  begin
    insert into public.bookings (pitch_id, kind, during, organizer_id, created_by, recorded, team_a_name,
                                 team_b_name, price_per_hour, slot_minutes, client_request_id)
    values (p_pitch, 'app',
            tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_ops.slot_minutes), '[)'),
            v_uid, v_uid, coalesce(p_recorded, true), v_team_a, v_team_b, v_ops.price_per_hour,
            v_ops.slot_minutes, p_client_request_id)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'check_violation';
  end;
  if v_phone is not null then
    insert into public.booking_private (booking_id, contact_phone) values (v_id, v_phone);
  end if;
  insert into public.booking_players (booking_id, user_id) values (v_id, v_uid);
  insert into public.events (user_id, name, properties)
  values (v_uid, 'booking_created', jsonb_build_object('booking', v_id, 'pitch', p_pitch,
                                                       'recorded', coalesce(p_recorded, true)));
  return private.booking_receipt(v_id);
end;
$$;

create function public.my_bookings()
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
  return (select coalesce(jsonb_agg(private.booking_receipt(b.id) order by lower(b.during)), '[]'::jsonb)
          from public.bookings b
          where b.kind = 'app' and upper(b.during) > now() - interval '30 days'
            and (b.organizer_id = v_uid
                 or exists (select 1 from public.booking_players bp
                            where bp.booking_id = b.id and bp.user_id = v_uid and bp.removed_at is null)));
end;
$$;

create function public.booking_details(p_booking uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_staff boolean;
  v_organizer boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.can_see_booking(p_booking) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  select private.is_facility_staff(p.facility_id), b.organizer_id = v_uid
  into v_staff, v_organizer
  from public.bookings b join public.pitches p on p.id = b.pitch_id where b.id = p_booking;
  return private.booking_receipt(p_booking) || jsonb_build_object(
    -- Participants and staff see first names as players chose them; nothing else about them.
    'players', (select coalesce(jsonb_agg(jsonb_build_object(
                  'name', pr.display_name, 'team', bp.team, 'bib', bp.bib,
                  'is_organizer', bp.user_id = b.organizer_id) order by bp.joined_at), '[]'::jsonb)
                from public.booking_players bp
                join public.profiles pr on pr.id = bp.user_id
                join public.bookings b on b.id = bp.booking_id
                where bp.booking_id = p_booking and bp.removed_at is null),
    'contact_phone', case when v_staff or v_organizer then
                       (select contact_phone from public.booking_private where booking_id = p_booking) end,
    'walk_in_name', case when v_staff then
                      (select walk_in_name from public.booking_private where booking_id = p_booking) end);
end;
$$;

-- The organizer cancels before the start; the venue's staff cancel with a reason. The slot frees
-- at once. Cancelling a cancelled booking changes nothing.
create function public.cancel_booking(p_booking uuid, p_reason public.booking_cancel_reason default 'organizer')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
  v_facility uuid;
  v_reason public.booking_cancel_reason;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null or not private.can_see_booking(p_booking) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  v_facility := (select facility_id from public.pitches where id = v_b.pitch_id);
  if v_b.status = 'cancelled' then
    return private.booking_receipt(p_booking);
  end if;
  if lower(v_b.during) <= now() then
    raise exception 'booking_started' using errcode = 'check_violation';
  end if;
  if private.is_facility_staff(v_facility) then
    v_reason := case when p_reason in ('venue_closed', 'weather', 'maintenance', 'staff_other') then p_reason
                     when v_b.organizer_id = v_uid then 'organizer' else 'staff_other' end;
  elsif v_b.organizer_id = v_uid then
    v_reason := 'organizer';
  else
    raise exception 'not_organizer' using errcode = 'insufficient_privilege';
  end if;
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = v_reason
  where id = p_booking;
  return private.booking_receipt(p_booking);
end;
$$;

-- An account going away cancels its future app bookings (contract §7): the slot frees and the
-- organizer link is removed by the foreign key. Past bookings keep only non-personal facts.
create function private.cancel_bookings_of_deleted_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancel_reason = 'account_deleted'
  where organizer_id = old.id and kind = 'app' and status = 'confirmed' and upper(during) > now();
  return old;
end;
$$;
create trigger profiles_cancel_bookings before delete on public.profiles
  for each row execute function private.cancel_bookings_of_deleted_profile();

-- The data export includes a person's bookings (their own organizer contact phone too).
create or replace function private.export_bookings(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'venue', coalesce(f.name_ar, f.name_en), 'field', coalesce(p.label_ar, p.label_en),
           'starts_at', lower(b.during), 'ends_at', upper(b.during), 'status', b.status,
           'organizer', b.organizer_id = p_user, 'recorded', b.recorded,
           'price_per_hour', b.price_per_hour, 'slot_minutes', b.slot_minutes,
           'cancel_reason', b.cancel_reason,
           'contact_phone', case when b.organizer_id = p_user then bpv.contact_phone end)
           order by lower(b.during)), '[]'::jsonb)
  from public.bookings b
  join public.pitches p on p.id = b.pitch_id
  join public.facilities f on f.id = p.facility_id
  left join public.booking_private bpv on bpv.booking_id = b.id
  where b.organizer_id = p_user
     or exists (select 1 from public.booking_players bp where bp.booking_id = b.id and bp.user_id = p_user);
$$;

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
    'staff_links', (select coalesce(jsonb_agg(jsonb_build_object(
                      'facility', coalesce(f.name_ar, f.name_en), 'created_at', i.created_at,
                      'expires_at', i.expires_at,
                      'status', case when i.accepted_at is not null then 'accepted'
                                     when i.revoked_at is not null then 'revoked'
                                     when i.expires_at <= now() then 'expired' else 'open' end)
                      order by i.created_at), '[]'::jsonb)
                    from public.staff_invites i join public.facilities f on f.id = i.facility_id
                    where i.created_by = p_user),
    'bookings', private.export_bookings(p_user),
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

revoke execute on function public.pitch_busy_ranges(uuid, timestamptz, timestamptz),
  public.create_booking(uuid, timestamptz, boolean, text, text, text, uuid), public.my_bookings(),
  public.booking_details(uuid), public.cancel_booking(uuid, public.booking_cancel_reason)
  from public, anon;
grant execute on function public.pitch_busy_ranges(uuid, timestamptz, timestamptz),
  public.create_booking(uuid, timestamptz, boolean, text, text, text, uuid), public.my_bookings(),
  public.booking_details(uuid), public.cancel_booking(uuid, public.booking_cancel_reason)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
