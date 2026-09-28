-- D1a: the prepared Jordan pitch catalog, read side (D-032, D-045; contract
-- agentic_system/contracts/pitch-catalog.md §2.1–2.2, §4, §5).
--
-- A facility is a venue; a pitch is one physical field in it, and search results are pitches,
-- each with its own "verified by Nujoom / not verified" badge. Design facts are nullable
-- (unknown is a value). Only verified participating fields with an active schedule can be
-- booked (private.pitch_is_bookable). Operators may stage operations privately before they are
-- verified; nothing about a not-verified field's operations is ever returned.
-- Writes (review, outreach, claims, verification) come in D1b; the import in D2.

create extension if not exists pg_trgm with schema extensions; -- name search index

-- ---------------------------------------------------------------------------
-- Governorates (coverage is reported per governorate)
-- ---------------------------------------------------------------------------
create table public.governorates (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'), -- ISO 3166-2:JO suffix
  name_ar text not null,
  name_en text not null,
  sort_order integer not null default 0
);
alter table public.governorates enable row level security;
revoke all on table public.governorates from anon, authenticated;
grant select on table public.governorates to anon, authenticated;
grant all on table public.governorates to service_role;
create policy "anyone can read governorates" on public.governorates
  for select to anon, authenticated using (true);

insert into public.governorates (code, name_ar, name_en, sort_order) values
  ('AM', 'العاصمة', 'Amman', 1),
  ('AZ', 'الزرقاء', 'Zarqa', 2),
  ('IR', 'إربد', 'Irbid', 3),
  ('AQ', 'العقبة', 'Aqaba', 4),
  ('BA', 'البلقاء', 'Balqa', 5),
  ('MD', 'مادبا', 'Madaba', 6),
  ('JA', 'جرش', 'Jerash', 7),
  ('MA', 'المفرق', 'Mafraq', 8),
  ('KA', 'الكرك', 'Karak', 9),
  ('AJ', 'عجلون', 'Ajloun', 10),
  ('MN', 'معان', 'Ma''an', 11),
  ('AT', 'الطفيلة', 'Tafilah', 12);

alter table public.cities add column governorate_code char(2) references public.governorates (code);
update public.cities c set governorate_code = m.code
from (values ('amman', 'AM'), ('zarqa', 'AZ'), ('irbid', 'IR'), ('aqaba', 'AQ'), ('salt', 'BA'),
             ('madaba', 'MD'), ('jerash', 'JA'), ('mafraq', 'MA'), ('karak', 'KA'),
             ('ajloun', 'AJ'), ('maan', 'MN'), ('tafilah', 'AT')) as m (slug, code)
where c.slug = m.slug;
alter table public.cities alter column governorate_code set not null;

-- ---------------------------------------------------------------------------
-- Settings: pause and freshness numbers are PROPOSALS (Codex, contract §3.1), not an approved SLA.
-- ---------------------------------------------------------------------------
insert into public.config (key, value, description) values
  ('catalog_freshness', '{"pause_days":30,"confirm_days":90,"grace_days":14}',
   'Proposed (not owner-approved): how long a verified field may pause, how old operator facts may get, and the grace before a downgrade.');

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.location_confidence as enum ('unchecked', 'approximate', 'map_checked', 'site_checked');
create type public.facility_access as enum
  ('public_rental', 'public_free', 'members_only', 'school_only', 'closed', 'unknown');
create type public.listing_state as enum ('candidate', 'published', 'hidden', 'duplicate', 'closed', 'rejected');
create type public.operator_state as enum
  ('none', 'contacted', 'responded', 'claimed', 'authority_verified', 'declined', 'opted_out');
create type public.pitch_surface as enum ('artificial_turf', 'natural_grass', 'hard_court', 'sand', 'other');
create type public.pitch_participation as enum ('not_verified', 'verified');
create type public.pitch_level as enum ('listed', 'dock', 'verified');
create type public.evidence_source as enum ('osm', 'operator', 'field_team', 'community', 'reviewer');

-- ---------------------------------------------------------------------------
-- Arabic-aware normalisation for name search: no tashkeel or tatweel; أ/إ/آ/ٱ → ا; ة → ه;
-- ى → ي; Persian ی/ک → ي/ك; lower case; single spaces.
-- ---------------------------------------------------------------------------
create function private.normalize_ar(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(lower(translate(
           regexp_replace(coalesce(p_text, ''), '[ً-ٰٟـ]', '', 'g'),
           'أإآٱةىیک', 'ااااهييك')), '\s+', ' ', 'g'));
$$;

-- Great-circle distance in km (haversine). Plain SQL: earthdistance's functions are not
-- schema-qualified internally and fail under a pinned empty search_path (D-045).
create function private.distance_km(p_lat1 double precision, p_lng1 double precision,
                                    p_lat2 double precision, p_lng2 double precision)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 6371.0 * 2 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)));
$$;

-- ---------------------------------------------------------------------------
-- Facilities: the venue (entrance, access, operator outreach).
-- ---------------------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name_ar text check (char_length(name_ar) between 2 and 120),
  name_en text check (char_length(name_en) between 2 and 120),
  city_id bigint not null references public.cities (id),
  neighborhood_id bigint,
  address_ar text check (char_length(address_ar) <= 200),
  address_en text check (char_length(address_en) <= 200),
  -- The entrance, not a centroid.
  lat double precision check (lat between 29 and 33.5),
  lng double precision check (lng between 34.8 and 39.5),
  location_confidence public.location_confidence not null default 'unchecked',
  access public.facility_access not null default 'unknown',
  listing_state public.listing_state not null default 'candidate',
  duplicate_of uuid references public.facilities (id),
  operator_state public.operator_state not null default 'none',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- (Plain || rather than concat_ws, which is only stable and can't feed a generated column.)
  search_text text generated always as
    (private.normalize_ar(coalesce(name_ar, '') || ' ' || coalesce(name_en, '') || ' '
                          || coalesce(address_ar, '') || ' ' || coalesce(address_en, ''))) stored,
  foreign key (neighborhood_id, city_id) references public.neighborhoods (id, city_id),
  check ((lat is null) = (lng is null)),
  check (location_confidence = 'unchecked' or lat is not null),
  check (listing_state <> 'duplicate' or duplicate_of is not null),
  check (duplicate_of is null or duplicate_of <> id),
  -- Publishing needs a name and public access (Q1: members-only/school fields stay out).
  constraint facilities_publishable check (
    listing_state <> 'published'
    or (coalesce(name_ar, name_en) is not null and access in ('public_rental', 'public_free')))
);
create index facilities_published_city_idx on public.facilities (city_id) where listing_state = 'published';
create index facilities_lat_lng_idx on public.facilities (lat, lng) where listing_state = 'published';
create index facilities_search_idx on public.facilities using gin (search_text extensions.gin_trgm_ops);
create trigger facilities_set_updated_at before update on public.facilities
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pitches: one physical field; the searchable unit with its own badge.
-- ---------------------------------------------------------------------------
create table public.pitches (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  label_ar text check (char_length(label_ar) between 1 and 60),
  label_en text check (char_length(label_en) between 1 and 60),
  players_per_side smallint check (players_per_side between 3 and 11),
  futsal boolean,
  length_m numeric(5, 1) check (length_m between 10 and 130),
  width_m numeric(5, 1) check (width_m between 5 and 100),
  surface public.pitch_surface,
  indoor boolean,
  lights boolean,
  -- null = unknown; {} = checked, none; otherwise evidenced items from a closed list.
  amenities text[] check (amenities is null or amenities <@ array[
    'changing_rooms', 'parking', 'water', 'seating', 'toilets', 'cafe']::text[]),
  listing_state public.listing_state not null default 'candidate',
  participation public.pitch_participation not null default 'not_verified',
  pitch_level public.pitch_level not null default 'listed',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participation = 'not_verified' or verified_at is not null)
);
create index pitches_facility_idx on public.pitches (facility_id);
create trigger pitches_set_updated_at before update on public.pitches
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Operations: owner-confirmed price and schedule. May be staged privately before the field is
-- verified (by staff of a claimed facility); public and bookable only once verified.
-- ---------------------------------------------------------------------------
create table public.pitch_operations (
  pitch_id uuid primary key references public.pitches (id) on delete cascade,
  price_per_hour numeric(6, 2) not null check (price_per_hour between 0 and 1000),
  price_note_ar text check (char_length(price_note_ar) <= 120),
  price_note_en text check (char_length(price_note_en) <= 120),
  slot_minutes smallint not null check (slot_minutes in (60, 90)),
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  schedule_active boolean not null default false,
  -- The staff member who confirmed; an audit reference, deliberately without a foreign key.
  confirmed_by uuid,
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pitch_operations_set_updated_at before update on public.pitch_operations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Evidence: append-only provenance for each published fact.
-- ---------------------------------------------------------------------------
create table public.pitch_evidence (
  id bigint generated always as identity primary key,
  facility_id uuid references public.facilities (id) on delete cascade,
  pitch_id uuid references public.pitches (id) on delete cascade,
  attribute text not null check (attribute ~ '^[a-z][a-z_]{1,40}$'),
  value jsonb not null,
  source_kind public.evidence_source not null,
  source_record_id uuid, -- source_records arrive with D2
  submission_id uuid,
  observed_at timestamptz,
  recorded_by uuid, -- audit reference, no foreign key
  recorded_at timestamptz not null default now(),
  check (num_nonnulls(facility_id, pitch_id) = 1)
);
create index pitch_evidence_pitch_idx on public.pitch_evidence (pitch_id);
create index pitch_evidence_facility_idx on public.pitch_evidence (facility_id);
create trigger pitch_evidence_append_only before update on public.pitch_evidence
  for each row execute function private.prevent_modification();

-- ---------------------------------------------------------------------------
-- Invariants no RPC can bypass
-- ---------------------------------------------------------------------------

-- Becoming verified needs an operator with verified authority and an active, confirmed schedule
-- (contract §3, §3.1). Staying verified while paused is allowed (the gate withholds booking).
create function private.check_pitch_participation()
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
  end if;
  return new;
end;
$$;
create trigger pitches_check_participation before insert or update of participation on public.pitches
  for each row execute function private.check_pitch_participation();

-- Operations exist only for a facility whose operator has at least claimed it.
create function private.check_operations_operator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.pitches p join public.facilities f on f.id = p.facility_id
                 where p.id = new.pitch_id and f.operator_state in ('claimed', 'authority_verified')) then
    raise exception 'operator_not_claimed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger pitch_operations_check_operator before insert or update on public.pitch_operations
  for each row execute function private.check_operations_operator();

-- ---------------------------------------------------------------------------
-- Access: clients never read the tables; the RPCs below are the read API.
-- ---------------------------------------------------------------------------
alter table public.facilities enable row level security;
alter table public.pitches enable row level security;
alter table public.pitch_operations enable row level security;
alter table public.pitch_evidence enable row level security;
revoke all on table public.facilities, public.pitches, public.pitch_operations, public.pitch_evidence
  from anon, authenticated;
grant all on table public.facilities, public.pitches, public.pitch_operations, public.pitch_evidence
  to service_role;

-- ---------------------------------------------------------------------------
-- The booking gate (contract §4): every booking, match and check-in path calls this.
-- ---------------------------------------------------------------------------
create function private.pitch_is_bookable(p_pitch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pitches p
    join public.facilities f on f.id = p.facility_id
    join public.pitch_operations o on o.pitch_id = p.id
    where p.id = p_pitch
      and p.listing_state = 'published' and f.listing_state = 'published'
      and p.participation = 'verified' and o.schedule_active);
$$;

-- One catalog listing (contract §5.1): the same record for list and map. A not-verified field
-- never carries operations; an unchecked location never carries coordinates.
create function private.catalog_listing(p public.pitches, f public.facilities,
                                        p_lat double precision, p_lng double precision)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pitch_id', p.id,
    'facility_id', f.id,
    'facility_name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
    'label', case when p.label_ar is null and p.label_en is null then null
                  else jsonb_build_object('ar', p.label_ar, 'en', p.label_en) end,
    'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en)
             from public.cities c where c.id = f.city_id),
    'neighborhood', (select jsonb_build_object('ar', n.name_ar, 'en', n.name_en)
                     from public.neighborhoods n where n.id = f.neighborhood_id),
    'badge', p.participation,
    'players_per_side', p.players_per_side,
    'futsal', p.futsal,
    'surface', p.surface,
    'indoor', p.indoor,
    'lights', p.lights,
    'amenities', to_jsonb(p.amenities),
    'location', case when f.location_confidence = 'unchecked' or f.lat is null then null
                     else jsonb_build_object('lat', f.lat, 'lng', f.lng,
                                             'confidence', f.location_confidence) end,
    'distance_km', case when p_lat is null or f.location_confidence = 'unchecked' or f.lat is null
                        then null
                        else round(private.distance_km(p_lat, p_lng, f.lat, f.lng)::numeric, 1) end,
    'access', f.access,
    'sources', (select coalesce(jsonb_agg(distinct e.source_kind), '[]'::jsonb)
                from public.pitch_evidence e where e.pitch_id = p.id or e.facility_id = f.id),
    'last_reviewed_at', f.last_reviewed_at,
    'photo', null, -- rights-cleared media arrive with pitch_media (D1b)
    'operations', case when p.participation <> 'verified' then null
                       else (select jsonb_build_object(
                               'price_per_hour', o.price_per_hour,
                               'price_note', case when o.price_note_ar is null and o.price_note_en is null
                                                  then null
                                                  else jsonb_build_object('ar', o.price_note_ar,
                                                                          'en', o.price_note_en) end,
                               'slot_minutes', o.slot_minutes,
                               'bookable', private.pitch_is_bookable(p.id))
                             from public.pitch_operations o where o.pitch_id = p.id) end);
$$;

-- ---------------------------------------------------------------------------
-- Read API (signed-in users; signed-out access waits for owner Q2)
-- ---------------------------------------------------------------------------
create function public.search_pitches(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce((p ->> 'limit')::integer, 20), 1), 50);
  v_offset integer := greatest(coalesce((p ->> 'cursor')::integer, 0), 0);
  v_q text := nullif(private.normalize_ar(p ->> 'q'), '');
  v_badge text := coalesce(p ->> 'badge', 'all');
  v_city bigint := (p ->> 'city_id')::bigint;
  v_hood bigint := (p ->> 'neighborhood_id')::bigint;
  v_sizes smallint[] := (select array_agg(x::smallint)
                         from jsonb_array_elements_text(coalesce(p -> 'players_per_side', '[]')) x);
  v_surfaces text[] := (select array_agg(x)
                        from jsonb_array_elements_text(coalesce(p -> 'surface', '[]')) x);
  v_indoor boolean := (p ->> 'indoor')::boolean;
  v_lights boolean := (p ->> 'lights')::boolean;
  v_lat double precision := (p -> 'near' ->> 'lat')::double precision;
  v_lng double precision := (p -> 'near' ->> 'lng')::double precision;
  v_km double precision := least(greatest(coalesce((p -> 'near' ->> 'km')::double precision, 10), 0.1), 25);
  v_box jsonb := p -> 'bbox';
  v_rows jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_badge not in ('all', 'verified', 'not_verified') then
    raise exception 'invalid_filter' using errcode = 'invalid_parameter_value';
  end if;
  if (v_lat is null) <> (v_lng is null) then
    raise exception 'invalid_filter' using errcode = 'invalid_parameter_value';
  end if;

  -- Rank and page first; build listings only for the page (plus one to know if there's more).
  select coalesce(jsonb_agg(private.catalog_listing(r.prow, r.frow, v_lat, v_lng) order by r.ord),
                  '[]'::jsonb) into v_rows
  from (
    select pi as prow, f as frow,
           row_number() over (
             order by
               case when v_lat is not null then private.distance_km(v_lat, v_lng, f.lat, f.lng) end
                 nulls last,
               (pi.participation = 'verified') desc,
               private.normalize_ar(coalesce(f.name_ar, f.name_en)),
               coalesce(pi.label_ar, pi.label_en) nulls first,
               pi.id) as ord
    from public.pitches pi
    join public.facilities f on f.id = pi.facility_id
    where pi.listing_state = 'published' and f.listing_state = 'published'
      and (v_city is null or f.city_id = v_city)
      and (v_hood is null or f.neighborhood_id = v_hood)
      and (v_badge = 'all' or pi.participation::text = v_badge)
      and (v_sizes is null or pi.players_per_side = any (v_sizes))
      and (v_surfaces is null or pi.surface::text = any (v_surfaces))
      and (v_indoor is null or pi.indoor = v_indoor)
      and (v_lights is null or pi.lights = v_lights)
      and (v_q is null
           or f.search_text like '%' || v_q || '%'
           or private.normalize_ar(concat_ws(' ', pi.label_ar, pi.label_en)) like '%' || v_q || '%'
           or exists (select 1 from public.neighborhoods n
                      where n.id = f.neighborhood_id
                        and private.normalize_ar(concat_ws(' ', n.name_ar, n.name_en)) like '%' || v_q || '%'))
      -- Near me: only places with a location we'd show, within v_km (bbox prefilter first).
      and (v_lat is null
           or (f.location_confidence <> 'unchecked'
               and f.lat between v_lat - v_km / 111.0 and v_lat + v_km / 111.0
               and f.lng between v_lng - v_km / (111.0 * cos(radians(v_lat)))
                             and v_lng + v_km / (111.0 * cos(radians(v_lat)))
               and private.distance_km(v_lat, v_lng, f.lat, f.lng) <= v_km))
      -- Map viewport
      and (v_box is null
           or (f.location_confidence <> 'unchecked'
               and f.lat between (v_box ->> 's')::double precision and (v_box ->> 'n')::double precision
               and f.lng between (v_box ->> 'w')::double precision and (v_box ->> 'e')::double precision))
  ) r
  where r.ord > v_offset and r.ord <= v_offset + v_limit + 1;

  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(v_rows) x
                                                  limit v_limit) s), '[]'::jsonb),
    'next_cursor', case when jsonb_array_length(v_rows) > v_limit then v_offset + v_limit end);
end;
$$;

create function public.catalog_pitch(p_pitch_id uuid)
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
    'can_report', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.search_pitches(jsonb), public.catalog_pitch(uuid) from public, anon;
grant execute on function public.search_pitches(jsonb), public.catalog_pitch(uuid)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
-- The generated search column is computed by whoever writes a facility (the service role).
grant execute on function private.normalize_ar(text) to service_role;
