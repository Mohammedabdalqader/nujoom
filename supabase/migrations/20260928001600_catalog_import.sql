-- D2 part 1: importing reviewed catalog records (D-051; contract §2.3, §6, test 8; handoff format
-- agentic_system/contracts/catalog-import.md).
--
-- Source records keep exactly what a source said (with its licence and version); the catalog
-- keeps the reviewed projection. An import only ever creates CANDIDATES: publishing, the badge
-- and operations stay admin/operator actions (D1). A record must carry a completed review
-- (access and field identity confirmed); anything claiming publication, a badge or operations is
-- refused. Re-running a batch is idempotent; a changed record is flagged for review and never
-- overwrites the catalog. Photo leads and multi-field facility leads are never imported.

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source ~ '^[a-z][a-z0-9_]{2,40}$'),
  batch_id text check (char_length(batch_id) <= 80),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  counts jsonb not null default '{}'::jsonb
);

create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source ~ '^[a-z][a-z0-9_]{2,40}$'),
  source_key text not null check (char_length(source_key) between 3 and 200),
  source_version text not null,
  licence text not null check (licence ~ '^[A-Za-z0-9_.-]{2,40}$'),
  raw jsonb not null check (pg_column_size(raw) <= 65536),
  geometry jsonb,
  first_seen_run uuid references public.import_runs (id),
  last_seen_run uuid references public.import_runs (id),
  gone_at timestamptz,
  -- A newer version arrived for an already imported record: a reviewer must look.
  needs_review boolean not null default false,
  facility_id uuid references public.facilities (id) on delete set null,
  pitch_id uuid references public.pitches (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_key)
);
create index source_records_review_idx on public.source_records (needs_review) where needs_review;
create trigger source_records_set_updated_at before update on public.source_records
  for each row execute function private.set_updated_at();

alter table public.pitch_evidence
  add constraint pitch_evidence_source_record_fk
  foreign key (source_record_id) references public.source_records (id) on delete set null;

alter table public.import_runs enable row level security;
alter table public.source_records enable row level security;
revoke all on table public.import_runs, public.source_records from anon, authenticated;
grant all on table public.import_runs, public.source_records to service_role;

-- ---------------------------------------------------------------------------
-- Import RPCs (service role: tools/catalog-import)
-- ---------------------------------------------------------------------------
create function public.import_start_run(p_source text, p_batch text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.import_runs (source, batch_id) values (p_source, p_batch) returning id;
$$;

-- One reviewed field record (the intake pitch shape plus `review`, see catalog-import.md).
-- Returns {status: created | unchanged | changed | rejected, reason?, pitch_id?}.
create function public.import_catalog_record(p_run uuid, p_licence text, p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := (select source from public.import_runs where id = p_run and finished_at is null);
  v_key text := p_record ->> 'id';
  v_version text := md5(p_record::text);
  v_review jsonb := p_record -> 'review';
  v_existing public.source_records;
  v_city bigint;
  v_hood bigint;
  v_facility uuid;
  v_pitch uuid;
  v_record uuid;
  v_confidence text;
  v_evidence jsonb;
begin
  if v_source is null then
    raise exception 'run_not_open' using errcode = 'invalid_parameter_value';
  end if;
  if v_key is null or v_key !~ '^[a-z0-9][a-z0-9-]{2,120}$' then
    return jsonb_build_object('status', 'rejected', 'reason', 'invalid_id');
  end if;

  -- The intake can never set what only review, operators and admins may.
  if coalesce(p_record ->> 'publication', '') <> 'unpublished'
     or coalesce(p_record ->> 'participation', '') <> 'not_verified'
     or jsonb_typeof(p_record -> 'operations') is distinct from 'null' then
    return jsonb_build_object('status', 'rejected', 'reason', 'claims_not_allowed', 'id', v_key);
  end if;
  if v_review is null
     or (v_review ->> 'accessConfirmed')::boolean is not true
     or (v_review ->> 'identityConfirmed')::boolean is not true
     or (v_review ->> 'reviewedAt') is null
     or (v_review ->> 'access') not in ('public_rental', 'public_free') then
    return jsonb_build_object('status', 'rejected', 'reason', 'not_reviewed', 'id', v_key);
  end if;
  v_confidence := coalesce(v_review ->> 'locationConfidence', 'unchecked');
  if v_confidence not in ('unchecked', 'approximate', 'map_checked', 'site_checked')
     or (v_confidence <> 'unchecked' and ((v_review ->> 'lat') is null or (v_review ->> 'lng') is null)) then
    return jsonb_build_object('status', 'rejected', 'reason', 'invalid_location', 'id', v_key);
  end if;
  if (p_record ->> 'surface') is not null and (p_record ->> 'surface') not in
       ('artificial_turf', 'natural_grass', 'hard_court', 'sand', 'other') then
    return jsonb_build_object('status', 'rejected', 'reason', 'invalid_value', 'id', v_key);
  end if;

  select id into v_city from public.cities
  where lower(name_en) = lower(p_record ->> 'city') or name_ar = p_record ->> 'city';
  if v_city is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'unknown_city', 'id', v_key);
  end if;
  select id into v_hood from public.neighborhoods
  where city_id = v_city and name_ar = p_record ->> 'areaAr';

  -- Idempotency (contract test 8): the same record is unchanged; a new version of an imported
  -- record is flagged for review and does not touch the catalog.
  select * into v_existing from public.source_records
  where source = v_source and source_key = v_key for update;
  if v_existing.id is not null then
    update public.source_records
    set last_seen_run = p_run, gone_at = null,
        needs_review = needs_review or source_version <> v_version,
        source_version = v_version, raw = p_record, licence = p_licence
    where id = v_existing.id;
    return jsonb_build_object('status', case when v_existing.source_version = v_version
                                             then 'unchanged' else 'changed' end,
                              'id', v_key, 'pitch_id', v_existing.pitch_id);
  end if;

  insert into public.source_records (source, source_key, source_version, licence, raw,
                                     first_seen_run, last_seen_run)
  values (v_source, v_key, v_version, p_licence, p_record, p_run, p_run)
  returning id into v_record;

  insert into public.facilities (city_id, neighborhood_id, name_ar, name_en, address_ar, lat, lng,
                                 location_confidence, access, last_reviewed_at)
  values (v_city, v_hood, nullif(btrim(p_record ->> 'facilityNameAr'), ''),
          nullif(btrim(p_record ->> 'facilityNameEn'), ''),
          nullif(btrim(p_record -> 'location' ->> 'addressAr'), ''),
          case when v_confidence <> 'unchecked' then (v_review ->> 'lat')::double precision end,
          case when v_confidence <> 'unchecked' then (v_review ->> 'lng')::double precision end,
          v_confidence::public.location_confidence, (v_review ->> 'access')::public.facility_access,
          (v_review ->> 'reviewedAt')::timestamptz)
  returning id into v_facility;
  insert into public.pitches (facility_id, label_ar, label_en, players_per_side, surface, indoor, lights)
  values (v_facility, nullif(btrim(p_record ->> 'fieldLabelAr'), ''),
          nullif(btrim(p_record ->> 'fieldLabelEn'), ''),
          (p_record ->> 'playersPerSide')::smallint,
          (p_record ->> 'surface')::public.pitch_surface,
          (p_record ->> 'indoor')::boolean, (p_record ->> 'lights')::boolean)
  returning id into v_pitch;
  update public.source_records set facility_id = v_facility, pitch_id = v_pitch where id = v_record;

  -- Each cited fact becomes evidence pointing at its source (internal; never shown to players).
  for v_evidence in select value from jsonb_array_elements(coalesce(p_record -> 'evidence', '[]')) loop
    insert into public.pitch_evidence (pitch_id, attribute, value, source_kind, source_record_id,
                                       observed_at)
    values (v_pitch, coalesce(nullif(v_evidence ->> 'fact', ''), 'fact'),
            jsonb_build_object('source_url', v_evidence ->> 'sourceUrl',
                               'summary', v_evidence ->> 'summary'),
            'reviewer', v_record,
            coalesce(p_record ->> 'checkedAt', v_review ->> 'reviewedAt')::timestamptz);
  end loop;
  insert into public.listing_reviews (facility_id, pitch_id, action, after, reason)
  values (v_facility, v_pitch, 'imported',
          jsonb_build_object('source', v_source, 'key', v_key, 'review', v_review), null);
  return jsonb_build_object('status', 'created', 'id', v_key, 'pitch_id', v_pitch);
exception
  when invalid_text_representation or numeric_value_out_of_range or check_violation then
    return jsonb_build_object('status', 'rejected', 'reason', 'invalid_value', 'id', v_key);
end;
$$;

-- Closes a run. For a full snapshot of a source (e.g. an OSM extract), records not seen in this
-- run are marked gone for a reviewer; research batches are partial and never mark anything gone.
create function public.import_finish_run(p_run uuid, p_full_snapshot boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_counts jsonb;
begin
  select source into v_source from public.import_runs where id = p_run and finished_at is null for update;
  if v_source is null then
    raise exception 'run_not_open' using errcode = 'invalid_parameter_value';
  end if;
  if p_full_snapshot then
    update public.source_records set gone_at = now()
    where source = v_source and last_seen_run is distinct from p_run and gone_at is null;
  end if;
  select jsonb_build_object(
           'seen', count(*) filter (where last_seen_run = p_run),
           'new', count(*) filter (where first_seen_run = p_run),
           'needs_review', count(*) filter (where needs_review),
           'gone', count(*) filter (where gone_at is not null))
    into v_counts
  from public.source_records where source = v_source;
  update public.import_runs set finished_at = now(), counts = v_counts where id = p_run;
  return v_counts;
end;
$$;

revoke execute on function public.import_start_run(text, text),
  public.import_catalog_record(uuid, text, jsonb), public.import_finish_run(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.import_start_run(text, text),
  public.import_catalog_record(uuid, text, jsonb), public.import_finish_run(uuid, boolean)
  to service_role;

revoke execute on all functions in schema private from public;
