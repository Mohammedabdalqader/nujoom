-- R0 foundation: extensions, the `private` helper schema, shared enums and helper functions.
-- Conventions (docs/DECISIONS.md D-011):
--   * Every table has RLS enabled and explicit grants; nothing relies on Supabase default grants.
--   * Helpers used by RLS policies live in `private`, which is not exposed through the Data API.
--   * SECURITY DEFINER functions always pin `search_path = ''` and use schema-qualified names.

create extension if not exists btree_gist with schema extensions; -- booking exclusion constraint

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
-- NOTE: Postgres grants EXECUTE on new functions to PUBLIC, and per-schema default privileges
-- cannot remove that. Every migration that creates functions in `private` therefore ends with
-- `revoke execute on all functions in schema private from public` and grants explicitly.
-- tests/database/001-security-baseline.sql enforces the allow-list.

-- ---------------------------------------------------------------------------
-- Enums shared across features
-- ---------------------------------------------------------------------------
create type public.player_position as enum ('GK', 'DEF', 'MID', 'FWD');
create type public.dominant_foot as enum ('left', 'right', 'both');
-- For youth, 'city' means "visible on city leaderboards" only, never a readable profile (spec §7).
create type public.profile_visibility as enum ('public', 'city', 'private');
-- U12 stays in the enum but is disabled by config.min_age = 13 (D-009).
create type public.age_group as enum ('U12', 'U14', 'U16', 'U18', 'ADULT');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'dead');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Today's calendar date in Amman (spec §1: timezone Asia/Amman).
create function private.amman_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Amman')::date;
$$;

-- Whole years between dob and on_date. Mirrors ageOn() in packages/shared/src/age.ts.
create function private.age_on(dob date, on_date date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select extract(year from age(on_date, dob))::integer;
$$;

-- Mirrors ageGroupFor() in packages/shared/src/age.ts (D-009).
create function private.age_group_for(age integer)
returns public.age_group
language sql
immutable
set search_path = ''
as $$
  select case
    when age < 12 then 'U12'::public.age_group
    when age < 14 then 'U14'::public.age_group
    when age < 16 then 'U16'::public.age_group
    when age < 18 then 'U18'::public.age_group
    else 'ADULT'::public.age_group
  end;
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.amman_today() to anon, authenticated, service_role;
grant execute on function private.age_on(date, date) to anon, authenticated, service_role;
grant execute on function private.age_group_for(integer) to anon, authenticated, service_role;
