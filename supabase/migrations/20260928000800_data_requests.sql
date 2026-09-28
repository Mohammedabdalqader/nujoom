-- S1-9 data rights, part 1: export and deletion requests (contract §4, spec §7, Jordan PDPL).
-- A user asks for a copy of their data or for their account to be deleted. Deletion waits a
-- cancellable grace period (7 days). The service role builds the export bundle
-- (public.export_user_data) and processes due deletions; the delivery and the deletion itself
-- land in the next S1-9 step (Edge Function + schedule).

insert into public.config (key, value, description) values
  ('data_rights', '{"deletion_grace_days":7,"export_link_days":7,"exports_per_day":2}',
   'Data export and account deletion (S1-9): grace before deletion, export link lifetime, export requests per day.');

create type public.data_request_kind as enum ('export', 'deletion');
create type public.data_request_status as enum ('pending', 'ready', 'completed', 'cancelled', 'failed');

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  -- Kept (without the user) after the account is gone, as the record that deletion happened.
  user_id uuid references auth.users (id) on delete set null,
  kind public.data_request_kind not null,
  status public.data_request_status not null default 'pending',
  requested_at timestamptz not null default clock_timestamp(), -- ordered, even within one transaction
  -- Deletion: the end of the grace period. Export: as soon as possible.
  scheduled_for timestamptz not null default now(),
  processed_at timestamptz,
  -- Export only: the private storage object and when its link stops working.
  export_path text,
  expires_at timestamptz,
  error text check (char_length(error) <= 500),
  check (kind = 'export' or (export_path is null and expires_at is null)),
  check (status <> 'ready' or (kind = 'export' and export_path is not null and expires_at is not null))
);
-- At most one open request of each kind per user.
create unique index data_requests_one_open_idx on public.data_requests (user_id, kind)
  where status = 'pending';
create index data_requests_due_idx on public.data_requests (scheduled_for)
  where status = 'pending';

alter table public.data_requests enable row level security;
revoke all on table public.data_requests from anon, authenticated;
-- The storage path and internal errors stay server-side.
grant select (id, kind, status, requested_at, scheduled_for, processed_at, expires_at)
  on table public.data_requests to authenticated;
grant all on table public.data_requests to service_role;

create policy "users see their own data requests" on public.data_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.data_rights_setting(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (value ->> p_key)::integer from public.config where key = 'data_rights';
$$;

create function private.data_request_json(r public.data_requests)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'kind', r.kind, 'status', r.status, 'requested_at', r.requested_at,
    'scheduled_for', r.scheduled_for, 'processed_at', r.processed_at, 'expires_at', r.expires_at);
$$;

-- ---------------------------------------------------------------------------
-- The user's side
-- ---------------------------------------------------------------------------
create function public.my_data_requests()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.data_request_json(r) order by r.requested_at desc), '[]'::jsonb)
  from (select * from public.data_requests
        where user_id = (select auth.uid())
        order by requested_at desc limit 20) r;
$$;

create function public.request_data_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.data_requests;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_request from public.data_requests
  where user_id = v_uid and kind = 'export' and status = 'pending';
  if v_request.id is not null then
    return private.data_request_json(v_request); -- already on its way
  end if;
  if not private.hit_rate_limit('data_export:' || v_uid, interval '1 day',
                                private.data_rights_setting('exports_per_day')) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  insert into public.data_requests (user_id, kind) values (v_uid, 'export')
  returning * into v_request;
  return private.data_request_json(v_request);
end;
$$;

create function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.data_requests;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_request from public.data_requests
  where user_id = v_uid and kind = 'deletion' and status = 'pending';
  if v_request.id is null then
    insert into public.data_requests (user_id, kind, scheduled_for)
    values (v_uid, 'deletion',
            now() + make_interval(days => private.data_rights_setting('deletion_grace_days')))
    returning * into v_request;
    perform private.write_audit('account.deletion_requested', 'user', v_uid::text,
                                jsonb_build_object('scheduled_for', v_request.scheduled_for));
  end if;
  return private.data_request_json(v_request);
end;
$$;

create function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.data_requests;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  update public.data_requests
  set status = 'cancelled', processed_at = now()
  where user_id = v_uid and kind = 'deletion' and status = 'pending'
  returning * into v_request;
  if v_request.id is null then
    raise exception 'no_pending_deletion' using errcode = 'no_data_found';
  end if;
  perform private.write_audit('account.deletion_cancelled', 'user', v_uid::text);
  return private.data_request_json(v_request);
end;
$$;

-- ---------------------------------------------------------------------------
-- The service side (Edge Function / worker)
-- ---------------------------------------------------------------------------

-- Everything we hold about one user, as one JSON document. Every table with a user reference
-- must appear here or in the documented exclusions of 050-data-requests.sql, which fails when a
-- new table appears, so later slices extend the bundle as they add data.
create function public.export_user_data(p_user uuid)
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
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
                 'name', e.name, 'properties', e.properties, 'created_at', e.created_at)
                 order by e.created_at), '[]'::jsonb)
               from public.events e where e.user_id = p_user),
    'data_requests', (select coalesce(jsonb_agg(private.data_request_json(r) order by r.requested_at),
                                      '[]'::jsonb)
                      from public.data_requests r where r.user_id = p_user)
  );
$$;

create function public.mark_data_export_ready(p_request uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_requests;
begin
  update public.data_requests
  set status = 'ready', processed_at = now(), export_path = p_path,
      expires_at = now() + make_interval(days => private.data_rights_setting('export_link_days'))
  where id = p_request and kind = 'export' and status = 'pending'
  returning * into v_request;
  if v_request.id is null then
    raise exception 'request_not_pending' using errcode = 'no_data_found';
  end if;
  return private.data_request_json(v_request);
end;
$$;

create function public.mark_data_request_failed(p_request uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.data_requests
  set status = 'failed', processed_at = now(), error = left(p_error, 500)
  where id = p_request and status = 'pending';
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.my_data_requests(), public.request_data_export(),
  public.request_account_deletion(), public.cancel_account_deletion(),
  public.export_user_data(uuid), public.mark_data_export_ready(uuid, text),
  public.mark_data_request_failed(uuid, text)
  from public, anon;
grant execute on function public.my_data_requests(), public.request_data_export(),
  public.request_account_deletion(), public.cancel_account_deletion()
  to authenticated, service_role;
revoke execute on function public.export_user_data(uuid), public.mark_data_export_ready(uuid, text),
  public.mark_data_request_failed(uuid, text)
  from authenticated;
grant execute on function public.export_user_data(uuid), public.mark_data_export_ready(uuid, text),
  public.mark_data_request_failed(uuid, text)
  to service_role;

revoke execute on all functions in schema private from public;
