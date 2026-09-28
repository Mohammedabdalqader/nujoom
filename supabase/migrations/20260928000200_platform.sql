-- R0 platform tables: admins, config, feature flags, audit log, analytics events, job queue.

-- ---------------------------------------------------------------------------
-- Admins (D-013: a table, not JWT claims — easy to audit and revoke instantly)
-- ---------------------------------------------------------------------------
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;
grant all on table public.app_admins to service_role;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
grant execute on function private.is_admin() to anon, authenticated, service_role;

create policy "admins can list admins" on public.app_admins
  for select to authenticated
  using ((select private.is_admin()));
-- No insert/update/delete policies: admins are granted with SQL or the service role only.

-- ---------------------------------------------------------------------------
-- Audit log (append-only; spec §6.12)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log (target_type, target_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from anon, authenticated, service_role;
grant select on table public.audit_log to authenticated;
grant select, insert on table public.audit_log to service_role;

create policy "admins can read the audit log" on public.audit_log
  for select to authenticated
  using ((select private.is_admin()));

create function private.prevent_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function private.prevent_modification();

create function private.write_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;
grant execute on function private.write_audit(text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Runtime configuration (rating parameters, clip window, trust weights …)
-- Typed in packages/shared/src/config.ts.
-- ---------------------------------------------------------------------------
create table public.config (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.config enable row level security;
alter table public.feature_flags enable row level security;

revoke all on table public.config, public.feature_flags from anon, authenticated;
grant select on table public.config to authenticated;
grant update (value, description) on table public.config to authenticated;
grant select on table public.feature_flags to anon, authenticated;
grant update (enabled, description) on table public.feature_flags to authenticated;
grant all on table public.config, public.feature_flags to service_role;

create policy "signed-in users can read config" on public.config
  for select to authenticated using (true);
create policy "admins can update config" on public.config
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "anyone can read feature flags" on public.feature_flags
  for select to anon, authenticated using (true);
create policy "admins can update feature flags" on public.feature_flags
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create function private.stamp_and_audit_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  perform private.write_audit(
    tg_table_name || '.update',
    tg_table_name,
    new.key,
    jsonb_build_object('old', to_jsonb(old) - 'updated_at' - 'updated_by',
                       'new', to_jsonb(new) - 'updated_at' - 'updated_by')
  );
  return new;
end;
$$;

create trigger config_audit
  before update on public.config
  for each row execute function private.stamp_and_audit_setting();
create trigger feature_flags_audit
  before update on public.feature_flags
  for each row execute function private.stamp_and_audit_setting();

-- ---------------------------------------------------------------------------
-- Analytics events (spec §6.13). Clients may write their own events; only admins read.
-- ---------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{2,63}$'),
  properties jsonb not null default '{}'::jsonb check (pg_column_size(properties) <= 8192),
  created_at timestamptz not null default now()
);
create index events_name_created_at_idx on public.events (name, created_at desc);
create index events_user_id_idx on public.events (user_id);

alter table public.events enable row level security;
revoke all on table public.events from anon, authenticated;
grant insert (name, properties) on table public.events to authenticated;
grant select on table public.events to authenticated;
grant all on table public.events to service_role;

create policy "users can log their own events" on public.events
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "admins can read events" on public.events
  for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Job queue (spec §6.9). Polled by services/video-worker with FOR UPDATE SKIP LOCKED.
-- Not reachable by clients at all; the worker and Edge Functions use the functions below.
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type ~ '^[a-z][a-z0-9_.]{2,63}$'),
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'queued',
  priority smallint not null default 0,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index jobs_ready_idx on public.jobs (priority desc, run_after)
  where status in ('queued', 'running');

alter table public.jobs enable row level security;
revoke all on table public.jobs from anon, authenticated;
grant all on table public.jobs to service_role;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function private.set_updated_at();

-- Enqueue a job. With an idempotency key, enqueuing twice returns the existing job.
create function private.enqueue_job(
  p_type text,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_key text default null,
  p_run_after timestamptz default now(),
  p_priority smallint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.jobs (type, payload, idempotency_key, run_after, priority)
  values (p_type, coalesce(p_payload, '{}'::jsonb), p_idempotency_key, p_run_after, p_priority)
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.jobs where idempotency_key = p_idempotency_key;
  end if;
  return v_id;
end;
$$;

-- Claim the next runnable job. Also reclaims jobs whose worker died (lock older than timeout).
create function private.claim_job(
  p_worker text,
  p_types text[] default null,
  p_lock_timeout interval default interval '15 minutes'
)
returns setof public.jobs
language sql
security definer
set search_path = ''
as $$
  with next_job as (
    select id
    from public.jobs
    where attempts < max_attempts
      and (p_types is null or type = any (p_types))
      and (
        (status = 'queued' and run_after <= now())
        or (status = 'running' and locked_at < now() - p_lock_timeout)
      )
    order by priority desc, run_after
    limit 1
    for update skip locked
  )
  update public.jobs as j
  set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
  from next_job
  where j.id = next_job.id
  returning j.*;
$$;

create function private.complete_job(p_id uuid, p_worker text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.jobs
    set status = 'succeeded', finished_at = now(), locked_at = null, last_error = null
    where id = p_id and locked_by = p_worker and status = 'running'
    returning 1
  )
  select exists (select 1 from done);
$$;

-- Record a failure. Retries with exponential backoff (30 s, 60 s, 120 s … capped at 1 h);
-- after max_attempts the job is marked dead for an admin to inspect.
create function private.fail_job(p_id uuid, p_worker text, p_error text)
returns public.job_status
language sql
security definer
set search_path = ''
as $$
  update public.jobs
  set status = case when attempts >= max_attempts then 'dead'::public.job_status
                    else 'queued'::public.job_status end,
      run_after = case when attempts >= max_attempts then run_after
                       else now() + least(interval '1 hour',
                                          interval '30 seconds' * power(2, greatest(attempts - 1, 0)))
                  end,
      finished_at = case when attempts >= max_attempts then now() end,
      locked_at = null,
      locked_by = null,
      last_error = left(p_error, 4000)
  where id = p_id and locked_by = p_worker and status = 'running'
  returning status;
$$;

-- Marks crashed jobs that have no attempts left as dead (otherwise they would sit in `running`).
create function private.reap_dead_jobs(p_lock_timeout interval default interval '15 minutes')
returns integer
language sql
security definer
set search_path = ''
as $$
  with reaped as (
    update public.jobs
    set status = 'dead', finished_at = now(), locked_at = null,
        last_error = coalesce(last_error, 'worker lock expired')
    where status = 'running' and attempts >= max_attempts and locked_at < now() - p_lock_timeout
    returning 1
  )
  select count(*)::integer from reaped;
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.enqueue_job(text, jsonb, text, timestamptz, smallint) to service_role;
grant execute on function private.claim_job(text, text[], interval) to service_role;
grant execute on function private.complete_job(uuid, text) to service_role;
grant execute on function private.fail_job(uuid, text, text) to service_role;
grant execute on function private.reap_dead_jobs(interval) to service_role;
