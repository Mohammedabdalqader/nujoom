-- S1 identity: profiles, private profile data (DOB), guardians (schema), append-only consents,
-- user settings, database rate limits and the onboarding / profile RPCs.
-- Contract: agentic_system/contracts/identity-booking.md §1, §4. Spec §6.1, §6.2, §7.
--
-- Rules encoded here so no client bug can break them:
--   * Clients never write these tables directly; every write goes through an RPC below.
--   * Youth (13–17) are private until a confirmed guardian chooses otherwise; they never set
--     their own visibility or presence (spec §7).
--   * Everyone is treated as youth until a date of birth proves otherwise (fail closed, D-012).
--   * Card codes are long and random (NJM-XXXX-XXXX) and never readable from the table.
--   * Terms and privacy gate the account. Recording is a separate choice that gates only
--     recorded matches; declining it never blocks the account (D-026, pending owner/legal).

create type public.guardian_status as enum ('pending', 'confirmed', 'revoked');
-- 'streaming' exists for M9; it is default-denied and never collected in the pilot.
create type public.consent_type as enum ('terms', 'privacy', 'recording', 'streaming');

insert into public.config (key, value, description) values
  ('consent_versions', '{"terms":"2026-09-28","privacy":"2026-09-28","recording":"2026-09-28"}',
   'Current version of each required consent. Bumping one sends every user through re-consent.'),
  ('card_code_lookup', '{"per_hour":20}',
   'Rate limit for finding a player by card code (contract §4).');

-- ---------------------------------------------------------------------------
-- Rate limits (contract §1). Fixed windows keyed by an arbitrary string, e.g.
-- 'card_lookup:<uid>'. Unlogged: losing counters on a crash only loosens limits briefly.
-- ---------------------------------------------------------------------------
create unlogged table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Counts one hit and returns false once the window already holds p_max hits.
create function private.hit_rate_limit(p_key text, p_window interval, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window))
                                      * extract(epoch from p_window));
  v_hits integer;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  -- Old windows are cleaned opportunistically; the table stays small.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Card codes: NJM-XXXX-XXXX, 8 random Crockford base32 characters (~1.1e12 codes).
-- ---------------------------------------------------------------------------
create function private.new_card_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_code text := '';
begin
  -- 256 is a multiple of 32, so byte % 32 is uniform.
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return 'NJM-' || substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (shareable fields; DOB lives in profile_private)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  handle text unique check (handle ~ '^[a-z0-9._]{3,20}$'),
  card_code text not null unique check (card_code ~ '^NJM-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
  city_id bigint references public.cities (id),
  neighborhood_id bigint,
  position public.player_position,
  dominant_foot public.dominant_foot,
  shirt_number smallint check (shirt_number between 1 and 99),
  avatar_path text check (avatar_path is null or (char_length(avatar_path) <= 200 and avatar_path like id::text || '/%')),
  -- Fail closed: private until the adult or the youth's guardian chooses otherwise.
  visibility public.profile_visibility not null default 'private',
  -- Fail closed: youth until a date of birth proves otherwise. Maintained by triggers.
  is_youth boolean not null default true,
  age_group public.age_group,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (neighborhood_id, city_id) references public.neighborhoods (id, city_id),
  check (neighborhood_id is null or city_id is not null)
);
create index profiles_city_id_idx on public.profiles (city_id);
create index profiles_neighborhood_id_idx on public.profiles (neighborhood_id);

create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dob date not null check (dob > date '1900-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  -- Friends see online/offline only when this is on; never for youth (spec §6.3, §7).
  share_presence boolean not null default false,
  -- "In a match at <pitch>": adults opt in; never for youth (D-006.5).
  share_in_match boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Guardians (spec §7). Invites, acceptance and revocation arrive with slice 3; the table and
-- the helpers exist now because profile visibility and the recorded-match gate depend on them.
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  youth_user_id uuid not null references public.profiles (id) on delete cascade,
  contact_email text not null check (contact_email = lower(contact_email) and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  guardian_user_id uuid references public.profiles (id) on delete set null,
  status public.guardian_status not null default 'pending',
  -- What the guardian allows: private (default), city (city leaderboards only), public.
  visibility_choice public.profile_visibility not null default 'private',
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  invite_send_count integer not null default 0,
  invite_last_sent_at timestamptz,
  confirmed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (youth_user_id, contact_email),
  check (guardian_user_id is null or guardian_user_id <> youth_user_id),
  check (status <> 'confirmed' or (guardian_user_id is not null and confirmed_at is not null))
);
create index guardians_guardian_user_id_idx on public.guardians (guardian_user_id) where status = 'confirmed';

-- Consents: append-only and versioned (spec §6.1, §7). granted = false records an opt-out.
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.consent_type not null,
  version text not null check (char_length(version) between 1 and 32),
  granted boolean not null,
  given_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index consents_user_type_idx on public.consents (user_id, type, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create function private.is_guardian_of(p_youth uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guardians
    where youth_user_id = p_youth and guardian_user_id = (select auth.uid()) and status = 'confirmed'
  );
$$;

create function private.my_city_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select city_id from public.profiles where id = (select auth.uid());
$$;

create function private.my_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(email) from auth.users where id = (select auth.uid()) and coalesce(email, '') <> '';
$$;

create function private.is_youth(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_youth from public.profiles where id = p_user), true);
$$;

-- Latest recording choice, at the current version, made by p_by (null = by the player).
create function private.recording_consent_by(p_user uuid, p_by uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select c.granted and c.version = (select value ->> 'recording' from public.config where key = 'consent_versions')
    from public.consents c
    where c.user_id = p_user and c.type = 'recording' and c.given_by = coalesce(p_by, p_user)
    order by c.created_at desc, c.id desc
    limit 1
  ), false);
$$;

-- Recording permission (D-026): adults decide for themselves. A youth needs their own yes and a
-- yes from a confirmed guardian; either one saying no is a no.
create function private.has_recording_consent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.recording_consent_by(p_user, null)
     and (not private.is_youth(p_user)
          or exists (select 1 from public.guardians g
                     where g.youth_user_id = p_user and g.status = 'confirmed'
                       and private.recording_consent_by(p_user, g.guardian_user_id)));
$$;

-- Spec §6.1, §7: joining a recorded match needs a finished profile, recording permission and,
-- for youth, a confirmed guardian.
create function private.can_join_recorded_matches(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.onboarded_at is not null and p.age_group is not null)
     and private.has_recording_consent(p_user)
     and (not private.is_youth(p_user)
          or exists (select 1 from public.guardians g where g.youth_user_id = p_user and g.status = 'confirmed'));
$$;

-- A youth's effective visibility: the most restrictive choice among confirmed guardians,
-- private with none ("no public presence", spec §7).
create function private.youth_visibility(p_youth uuid)
returns public.profile_visibility
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) = 0 then 'private'::public.profile_visibility
    when bool_or(visibility_choice = 'private') then 'private'::public.profile_visibility
    when bool_or(visibility_choice = 'city') then 'city'::public.profile_visibility
    else 'public'::public.profile_visibility
  end
  from public.guardians
  where youth_user_id = p_youth and status = 'confirmed';
$$;

-- The one visibility rule for profiles and what hangs off them (avatars, cards). Later slices
-- widen it (match co-participants in S2, friends in S3) by replacing this function.
create function private.can_view_profile(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_target
      and p.onboarded_at is not null
      and (
        p.id = (select auth.uid())
        or p.visibility = 'public'
        -- For youth, 'city' means city leaderboards only, never the profile (spec §7).
        or (p.visibility = 'city' and not p.is_youth and p.city_id = private.my_city_id())
        or private.is_guardian_of(p.id)
        or private.is_admin()
      )
  ) or p_target = (select auth.uid());
$$;

-- Storage object names are `<user_id>/<file>`; anything else is not viewable.
create function private.can_view_avatar(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(p_object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.can_view_profile(split_part(p_object_name, '/', 1)::uuid)
    else false
  end;
$$;

-- The account gate: the latest terms and privacy rows are granted at the configured versions.
create function private.has_current_consents(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with versions as (
    select e.key as type, e.value as version
    from public.config c, jsonb_each_text(c.value) e
    where c.key = 'consent_versions'
  ),
  latest as (
    select distinct on (type) type::text as type, version, granted
    from public.consents
    where user_id = p_user and type in ('terms', 'privacy')
    order by type, created_at desc, id desc
  )
  select count(*) = 2
  from versions v join latest l on l.type = v.type
  where l.granted and l.version = v.version;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: card codes, age, youth visibility and presence, append-only consents
-- ---------------------------------------------------------------------------
create function private.enforce_profile_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dob date;
  v_age integer;
begin
  if tg_op = 'INSERT' then
    -- Retry on the (astronomically rare) collision instead of failing onboarding.
    loop
      new.card_code := private.new_card_code();
      exit when not exists (select 1 from public.profiles where card_code = new.card_code);
    end loop;
    select dob into v_dob from public.profile_private where user_id = new.id;
    if v_dob is null then
      new.is_youth := true;
      new.age_group := null;
    else
      v_age := private.age_on(v_dob, private.amman_today());
      new.is_youth := v_age < 18;
      new.age_group := private.age_group_for(v_age);
    end if;
  else
    new.card_code := old.card_code; -- never changes
  end if;

  -- Youth never choose their own visibility; their guardians do.
  if new.is_youth then
    new.visibility := private.youth_visibility(new.id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_enforce_rules
  before insert or update on public.profiles
  for each row execute function private.enforce_profile_rules();

create function private.validate_dob()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min_age integer := coalesce((select (value #>> '{}')::integer from public.config where key = 'min_age'), 13);
begin
  if new.dob > private.amman_today() then
    raise exception 'dob_in_future' using errcode = 'check_violation';
  end if;
  if private.age_on(new.dob, private.amman_today()) < v_min_age then
    raise exception 'below_min_age' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profile_private_validate_dob
  before insert or update of dob on public.profile_private
  for each row execute function private.validate_dob();

create function private.sync_age_from_dob()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_age integer := private.age_on(new.dob, private.amman_today());
begin
  update public.profiles
  set is_youth = v_age < 18, age_group = private.age_group_for(v_age)
  where id = new.user_id;
  return null;
end;
$$;
create trigger profile_private_sync_age
  after insert or update of dob on public.profile_private
  for each row execute function private.sync_age_from_dob();

-- Nightly: birthdays move players between age groups. Turning 18 keeps the current (usually
-- private) visibility until the new adult changes it.
create function private.refresh_age_groups()
returns integer
language sql
security definer
set search_path = ''
as $$
  with fresh as (
    select pp.user_id,
           private.age_on(pp.dob, private.amman_today()) < 18 as is_youth,
           private.age_group_for(private.age_on(pp.dob, private.amman_today())) as age_group
    from public.profile_private pp
  ),
  changed as (
    update public.profiles p
    set is_youth = fresh.is_youth, age_group = fresh.age_group
    from fresh
    where p.id = fresh.user_id
      and (p.is_youth is distinct from fresh.is_youth or p.age_group is distinct from fresh.age_group)
    returning 1
  )
  select count(*)::integer from changed;
$$;

-- Presence stays off for youth whatever the client sends (spec §7).
create function private.enforce_settings_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_youth(new.user_id) then
    new.share_presence := false;
    new.share_in_match := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger user_settings_enforce_rules
  before insert or update on public.user_settings
  for each row execute function private.enforce_settings_rules();

-- A youth's profile recomputes visibility on any update (see enforce_profile_rules), and their
-- settings re-apply the presence rule.
create function private.sync_youth_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_youth uuid := coalesce(new.youth_user_id, old.youth_user_id);
begin
  update public.profiles set updated_at = now() where id = v_youth and is_youth;
  return null;
end;
$$;
create trigger guardians_sync_youth_rules
  after insert or update or delete on public.guardians
  for each row execute function private.sync_youth_rules();

create function private.sync_settings_on_age_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_youth is distinct from old.is_youth then
    update public.user_settings set updated_at = now() where user_id = new.id;
  end if;
  return null;
end;
$$;
create trigger profiles_sync_settings
  after update of is_youth on public.profiles
  for each row execute function private.sync_settings_on_age_change();

create function private.limit_guardians()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.guardians
      where youth_user_id = new.youth_user_id and status <> 'revoked') >= 2 then
    raise exception 'too_many_guardians' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger guardians_limit
  before insert on public.guardians
  for each row execute function private.limit_guardians();
create trigger guardians_set_updated_at
  before update on public.guardians
  for each row execute function private.set_updated_at();

-- Updates never; deletes only through the auth.users cascade (account deletion).
create trigger consents_append_only
  before update on public.consents
  for each row execute function private.prevent_modification();

-- ---------------------------------------------------------------------------
-- Grants and policies: clients read; only RPCs write.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_settings enable row level security;
alter table public.guardians enable row level security;
alter table public.consents enable row level security;

revoke all on table public.profiles, public.profile_private, public.user_settings, public.guardians, public.consents
  from anon, authenticated;
grant all on table public.profiles, public.profile_private, public.user_settings, public.guardians, public.consents
  to service_role;

-- card_code is left out: it is shown only to its owner (me()) and looked up by exact match.
grant select (id, display_name, handle, city_id, neighborhood_id, position, dominant_foot, shirt_number,
              avatar_path, visibility, is_youth, age_group, onboarded_at, created_at)
  on table public.profiles to anon, authenticated;
grant select on table public.profile_private, public.user_settings, public.consents to authenticated;
grant select (id, youth_user_id, contact_email, guardian_user_id, status, visibility_choice,
              invite_expires_at, confirmed_at, revoked_at, created_at)
  on table public.guardians to authenticated;

create policy "public profiles are readable by anyone" on public.profiles
  for select to anon
  using (visibility = 'public' and onboarded_at is not null);
create policy "profiles readable per visibility rules" on public.profiles
  for select to authenticated
  using ((select private.can_view_profile(id)));

create policy "owner, guardians and admins read private profile data" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_guardian_of(user_id)) or (select private.is_admin()));

create policy "owners read their settings" on public.user_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "youth, guardian and admins read guardian links" on public.guardians
  for select to authenticated
  using (youth_user_id = (select auth.uid()) or guardian_user_id = (select auth.uid()) or (select private.is_admin()));

create policy "consents readable by subject, giver, guardians and admins" on public.consents
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or given_by = (select auth.uid())
    or (select private.is_guardian_of(user_id))
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- The session in one round trip: identity, settings, guardian state and journey stage.
-- Mirrors routeFor() in packages/shared/src/journey.ts.
create function public.me()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.profiles;
  v_s public.user_settings;
  v_guardian text;
  v_consents boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.id is null or v_p.onboarded_at is null then
    return jsonb_build_object('id', v_uid, 'email', private.my_email(), 'stage', 'onboarding');
  end if;
  select * into v_s from public.user_settings where user_id = v_uid;
  select case
           when bool_or(status = 'confirmed') then 'confirmed'
           when bool_or(status = 'pending') then 'pending'
           else 'none'
         end
    into v_guardian
    from public.guardians where youth_user_id = v_uid;
  v_consents := private.has_current_consents(v_uid);

  return jsonb_build_object(
    'id', v_p.id,
    'email', private.my_email(),
    'display_name', v_p.display_name,
    'handle', v_p.handle,
    'card_code', v_p.card_code,
    'city_id', v_p.city_id,
    'neighborhood_id', v_p.neighborhood_id,
    'position', v_p.position,
    'dominant_foot', v_p.dominant_foot,
    'shirt_number', v_p.shirt_number,
    'avatar_path', v_p.avatar_path,
    'visibility', v_p.visibility,
    'is_youth', v_p.is_youth,
    'age_group', v_p.age_group,
    'onboarded_at', v_p.onboarded_at,
    'guardian', coalesce(v_guardian, 'none'),
    'recording_consent', private.recording_consent_by(v_uid, null),
    'can_join_recorded', private.can_join_recorded_matches(v_uid),
    'consents_current', v_consents,
    'settings', jsonb_build_object(
      'locale', coalesce(v_s.locale, 'ar'),
      'share_presence', coalesce(v_s.share_presence, false),
      'share_in_match', coalesce(v_s.share_in_match, false)),
    'stage', case
               when not v_consents then 'consent'
               when v_p.is_youth and coalesce(v_guardian, 'none') = 'none' then 'guardian'
               else 'app'
             end
  );
end;
$$;

-- Shared validation for onboarding and profile edits.
create function private.assert_profile_fields(
  p_uid uuid, p_display_name text, p_handle text, p_city_id bigint, p_neighborhood_id bigint
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 40 then
    raise exception 'invalid_name' using errcode = 'check_violation';
  end if;
  if p_handle is not null then
    if p_handle !~ '^[a-z0-9._]{3,20}$' then
      raise exception 'invalid_handle' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.profiles where handle = p_handle and id <> p_uid) then
      raise exception 'handle_taken' using errcode = 'unique_violation';
    end if;
  end if;
  if p_city_id is null or not exists (select 1 from public.cities where id = p_city_id and is_active) then
    raise exception 'invalid_city' using errcode = 'check_violation';
  end if;
  if p_neighborhood_id is null then
    -- Required wherever the city has neighbourhoods (they drive neighbourhood leaderboards).
    if exists (select 1 from public.neighborhoods where city_id = p_city_id and is_active) then
      raise exception 'invalid_neighborhood' using errcode = 'check_violation';
    end if;
  elsif not exists (select 1 from public.neighborhoods
                    where id = p_neighborhood_id and city_id = p_city_id and is_active) then
    raise exception 'invalid_neighborhood' using errcode = 'check_violation';
  end if;
end;
$$;

-- Onboarding (spec §6.1): profile, DOB, settings and consents in one transaction, so a
-- half-finished sign-up never leaves a profile without an age or consents.
-- p_consents: {"terms": "<version>", "privacy": "<version>", "recording": "<version>" | false}.
-- Terms and privacy are required. Recording is the player's own choice: a version means yes,
-- false means no, and both are stored (D-026).
create function public.complete_onboarding(
  p_display_name text,
  p_dob date,
  p_city_id bigint,
  p_neighborhood_id bigint,
  p_position public.player_position,
  p_consents jsonb,
  p_dominant_foot public.dominant_foot default null,
  p_handle text default null,
  p_visibility public.profile_visibility default 'city',
  p_shirt_number integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_versions jsonb := (select value from public.config where key = 'consent_versions');
  v_type text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'unique_violation';
  end if;
  if p_position is null then
    raise exception 'invalid_position' using errcode = 'check_violation';
  end if;
  perform private.assert_profile_fields(v_uid, p_display_name, lower(nullif(btrim(p_handle), '')),
                                        p_city_id, p_neighborhood_id);
  foreach v_type in array array['terms', 'privacy'] loop
    if p_consents is null or jsonb_typeof(p_consents -> v_type) is distinct from 'string' then
      raise exception 'consent_required' using errcode = 'check_violation';
    end if;
    if p_consents ->> v_type is distinct from v_versions ->> v_type then
      raise exception 'consent_outdated' using errcode = 'check_violation';
    end if;
  end loop;
  if jsonb_typeof(p_consents -> 'recording') = 'string'
     and p_consents ->> 'recording' is distinct from v_versions ->> 'recording' then
    raise exception 'consent_outdated' using errcode = 'check_violation';
  end if;
  if p_shirt_number is not null and p_shirt_number not between 1 and 99 then
    raise exception 'invalid_shirt_number' using errcode = 'check_violation';
  end if;

  -- A failed attempt rolls back entirely, so no half-written profile can exist here.
  insert into public.profiles (id, display_name, handle, city_id, neighborhood_id, position, dominant_foot,
                               shirt_number)
  values (v_uid, btrim(p_display_name), lower(nullif(btrim(p_handle), '')), p_city_id, p_neighborhood_id,
          p_position, p_dominant_foot, p_shirt_number);

  -- Validates the minimum age and derives is_youth / age_group (triggers).
  insert into public.profile_private (user_id, dob) values (v_uid, p_dob);

  -- Adults choose; for youth the trigger keeps the guardian-derived value (private).
  update public.profiles
  set visibility = coalesce(p_visibility, 'private'), onboarded_at = now()
  where id = v_uid;

  insert into public.user_settings (user_id) values (v_uid) on conflict (user_id) do nothing;

  insert into public.consents (user_id, type, version, granted, given_by)
  select v_uid, t::public.consent_type, v_versions ->> t, true, v_uid
  from unnest(array['terms', 'privacy']) t;
  -- Recording is stored either way when the player answered; not answered means no row (= no).
  if p_consents ? 'recording' then
    insert into public.consents (user_id, type, version, granted, given_by)
    values (v_uid, 'recording', v_versions ->> 'recording',
            jsonb_typeof(p_consents -> 'recording') = 'string', v_uid);
  end if;

  return public.me();
end;
$$;

-- Profile edits. Keys present in p_patch change; absent keys stay. DOB is not editable
-- (a youth could otherwise edit their way out of guardian control).
create function public.update_profile(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.profiles;
  v_name text;
  v_handle text;
  v_city bigint;
  v_hood bigint;
  v_avatar text;
  v_shirt integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_p from public.profiles where id = v_uid and onboarded_at is not null;
  if v_p.id is null then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_patch) k
                where k not in ('display_name', 'handle', 'city_id', 'neighborhood_id', 'position',
                                'dominant_foot', 'shirt_number', 'avatar_path')) then
    raise exception 'invalid_patch' using errcode = 'check_violation';
  end if;

  v_name := case when p_patch ? 'display_name' then p_patch ->> 'display_name' else v_p.display_name end;
  v_handle := case when p_patch ? 'handle' then lower(nullif(btrim(p_patch ->> 'handle'), '')) else v_p.handle end;
  v_city := case when p_patch ? 'city_id' then (p_patch ->> 'city_id')::bigint else v_p.city_id end;
  v_hood := case when p_patch ? 'neighborhood_id' then (p_patch ->> 'neighborhood_id')::bigint
                 when p_patch ? 'city_id' then null else v_p.neighborhood_id end;
  perform private.assert_profile_fields(v_uid, v_name, v_handle, v_city, v_hood);

  v_avatar := case when p_patch ? 'avatar_path' then nullif(p_patch ->> 'avatar_path', '') else v_p.avatar_path end;
  if v_avatar is not null and (v_avatar not like v_uid::text || '/%' or char_length(v_avatar) > 200
                               or v_avatar ~ '\.\.') then
    raise exception 'invalid_avatar' using errcode = 'check_violation';
  end if;
  v_shirt := case when p_patch ? 'shirt_number' then (p_patch ->> 'shirt_number')::integer else v_p.shirt_number end;
  if v_shirt is not null and v_shirt not between 1 and 99 then
    raise exception 'invalid_shirt_number' using errcode = 'check_violation';
  end if;
  if p_patch ? 'position' and p_patch ->> 'position' is null then
    raise exception 'invalid_position' using errcode = 'check_violation';
  end if;

  update public.profiles
  set display_name = btrim(v_name),
      handle = v_handle,
      city_id = v_city,
      neighborhood_id = v_hood,
      position = case when p_patch ? 'position' then (p_patch ->> 'position')::public.player_position else position end,
      dominant_foot = case when p_patch ? 'dominant_foot' then (p_patch ->> 'dominant_foot')::public.dominant_foot
                           else dominant_foot end,
      shirt_number = v_shirt,
      avatar_path = v_avatar
  where id = v_uid;
  return public.me();
exception
  when invalid_text_representation or invalid_parameter_value or numeric_value_out_of_range then
    raise exception 'invalid_patch' using errcode = 'check_violation';
end;
$$;

-- Adults choose their visibility; a youth's is set by their guardian (spec §7).
create function public.set_visibility(p_visibility public.profile_visibility)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if private.is_youth(v_uid) then
    raise exception 'guardian_controls_visibility' using errcode = 'insufficient_privilege';
  end if;
  if p_visibility is null then
    raise exception 'invalid_patch' using errcode = 'check_violation';
  end if;
  update public.profiles set visibility = p_visibility where id = v_uid;
  return public.me();
end;
$$;

create function public.set_settings(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.user_settings where user_id = v_uid) then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_patch) k
                where k not in ('locale', 'share_presence', 'share_in_match')) then
    raise exception 'invalid_patch' using errcode = 'check_violation';
  end if;
  if p_patch ? 'locale' and p_patch ->> 'locale' not in ('ar', 'en') then
    raise exception 'invalid_patch' using errcode = 'check_violation';
  end if;
  if private.is_youth(v_uid)
     and (coalesce((p_patch ->> 'share_presence')::boolean, false)
          or coalesce((p_patch ->> 'share_in_match')::boolean, false)) then
    raise exception 'youth_presence_hidden' using errcode = 'insufficient_privilege';
  end if;
  update public.user_settings
  set locale = coalesce(p_patch ->> 'locale', locale),
      share_presence = coalesce((p_patch ->> 'share_presence')::boolean, share_presence),
      share_in_match = coalesce((p_patch ->> 'share_in_match')::boolean, share_in_match)
  where user_id = v_uid;
  return public.me();
exception
  when invalid_text_representation then
    raise exception 'invalid_patch' using errcode = 'check_violation';
end;
$$;

-- Later consent changes: re-accepting a new terms/privacy version, giving or withdrawing
-- recording permission (D-026), or the "no live" opt-out. Streaming can't be granted before M9.
create function public.record_consent(p_type public.consent_type, p_version text, p_granted boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_current text := (select value ->> p_type::text from public.config where key = 'consent_versions');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if p_type = 'streaming' then
    if p_granted is distinct from false then
      raise exception 'streaming_not_available' using errcode = 'check_violation';
    end if;
  elsif p_type = 'recording' then
    if p_granted is null or (p_granted and p_version is distinct from v_current) then
      raise exception 'invalid_consent' using errcode = 'check_violation';
    end if;
    p_version := coalesce(p_version, v_current);
  elsif p_granted is distinct from true or p_version is distinct from v_current then
    -- Required consents can't be withdrawn here; withdrawing them means deleting the account.
    raise exception 'invalid_consent' using errcode = 'check_violation';
  end if;
  insert into public.consents (user_id, type, version, granted, given_by)
  values (v_uid, p_type, coalesce(p_version, 'n/a'), p_granted, v_uid);
  return public.me();
end;
$$;

-- What the viewer may see of another player. Hidden players return null (not an error), so a
-- caller can't tell a private profile from a missing one.
create function public.player_profile(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.can_view_profile(p.id) then jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'handle', p.handle,
    'avatar_path', p.avatar_path,
    'city_id', p.city_id,
    'neighborhood_id', p.neighborhood_id,
    'position', p.position,
    'dominant_foot', p.dominant_foot,
    'shirt_number', p.shirt_number,
    'age_group', p.age_group,
    'is_self', p.id = (select auth.uid())
  ) end
  from public.profiles p
  where p.id = p_user and p.onboarded_at is not null;
$$;

-- ---------------------------------------------------------------------------
-- Avatars: private bucket, `<user_id>/<file>`, signed URLs for whoever may see the profile.
-- Guarded so plain-Postgres test databases without Storage still migrate.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage schema not present; skipping avatars bucket';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', false, 524288, array['image/jpeg', 'image/webp'])
  on conflict (id) do nothing;
  execute $p$
    create policy "users manage their own avatar files" on storage.objects
      for all to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "avatars follow profile visibility" on storage.objects
      for select to authenticated
      using (bucket_id = 'avatars' and (select private.can_view_avatar(name)))
  $p$;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled maintenance (pg_cron on Supabase; skipped where the extension is missing).
-- Scheduling by name replaces any job of the same name left from an earlier database.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- 00:05 Amman time (21:05 UTC; Jordan is UTC+3 all year).
    perform cron.schedule('refresh-age-groups', '5 21 * * *', 'select private.refresh_age_groups()');
    perform cron.schedule('reap-dead-jobs', '*/5 * * * *', 'select private.reap_dead_jobs()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.me(), public.complete_onboarding(text, date, bigint, bigint, public.player_position, jsonb, public.dominant_foot, text, public.profile_visibility, integer),
  public.update_profile(jsonb), public.set_visibility(public.profile_visibility), public.set_settings(jsonb),
  public.record_consent(public.consent_type, text, boolean), public.player_profile(uuid)
  from public, anon;
grant execute on function public.me(), public.complete_onboarding(text, date, bigint, bigint, public.player_position, jsonb, public.dominant_foot, text, public.profile_visibility, integer),
  public.update_profile(jsonb), public.set_visibility(public.profile_visibility), public.set_settings(jsonb),
  public.record_consent(public.consent_type, text, boolean), public.player_profile(uuid)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
-- Only helpers that RLS policies call directly are executable by clients.
grant execute on function private.is_guardian_of(uuid), private.can_view_profile(uuid), private.can_view_avatar(text)
  to authenticated, service_role;
grant execute on function private.refresh_age_groups(), private.hit_rate_limit(text, interval, integer),
  private.can_join_recorded_matches(uuid), private.youth_visibility(uuid), private.is_youth(uuid),
  private.my_city_id(), private.my_email(), private.has_current_consents(uuid), private.new_card_code(),
  private.recording_consent_by(uuid, uuid), private.has_recording_consent(uuid)
  to service_role;
