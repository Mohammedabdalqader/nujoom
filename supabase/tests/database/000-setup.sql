-- Test helpers. Files run in alphabetical order, so this runs first and (unlike the
-- other files) commits, leaving the `tests` schema available to every later file.
-- It only ever exists in local/CI databases (`pnpm db:test`, `supabase test db`), never in production.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Creates an auth user. Later milestones extend this with a profile (R1).
create or replace function tests.create_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at)
  values (v_id, 'authenticated', 'authenticated', p_email, now(), now());
  return v_id;
end;
$$;

create or replace function tests.make_admin(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.app_admins (user_id) values (p_user) on conflict do nothing;
$$;

-- Act as a signed-in user for the rest of the transaction (until tests.act_as_postgres()).
create or replace function tests.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.act_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.act_as_service()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'service_role', true);
end;
$$;

create or replace function tests.act_as_postgres()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

create or replace function tests.set_email(p_user uuid, p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update auth.users set email = p_email where id = p_user;
$$;

-- Remember ids across statements of one test transaction, independent of the current role.
create or replace function tests.remember(p_name text, p_id uuid)
returns uuid
language sql
as $$
  select set_config('tests.' || p_name, p_id::text, true)::uuid;
$$;

create or replace function tests.id(p_name text)
returns uuid
language sql
stable
as $$
  select current_setting('tests.' || p_name)::uuid;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select plan(1);
select has_function('tests', 'act_as', array['uuid'], 'test helpers are installed');
select * from finish();
