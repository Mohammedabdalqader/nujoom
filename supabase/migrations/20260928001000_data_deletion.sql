-- S1-9 data rights, part 3: carrying out due account deletions and expiring export files
-- (D-038, D-039, D-040; contract §4; spec §7).
--
-- Every hour pg_cron asks the `data-deletion` Edge Function to run (pg_net). The function
-- authenticates the call with a random secret that exists only in this database's vault
-- (checked through check_data_rights_secret), then for each due request:
--   prepare_account_deletion → remove the user's storage files → delete the auth user
--   → finish_account_deletion
-- and removes export files whose link has expired (expire_data_exports).
-- Storage files can only be removed through the Storage API, hence the function.

-- Where the scheduler reaches the Edge Functions. Environment-specific: another project updates
-- this row (it is not a secret).
update public.config
set value = value || '{"functions_url":"https://lowqyfbmzeixnadamezx.supabase.co/functions/v1"}'::jsonb
where key = 'data_rights';

-- Consents stay append-only, with one exception: when the person who gave a consent (a
-- guardian) deletes their account, the foreign key's ON DELETE SET NULL de-identifies
-- `given_by`. Only that exact change passes; anything else is still refused.
create function private.consents_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.given_by is not null and new.given_by is null
     and (to_jsonb(new) - 'given_by') = (to_jsonb(old) - 'given_by') then
    return new;
  end if;
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
drop trigger consents_append_only on public.consents;
create trigger consents_append_only
  before update on public.consents
  for each row execute function private.consents_append_only();

-- Accounts whose grace period has ended, oldest first.
create function public.due_account_deletions(p_limit integer default 20)
returns table (request_id uuid, user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id
  from public.data_requests r
  where r.kind = 'deletion' and r.status = 'pending' and r.scheduled_for <= now()
    and r.user_id is not null
  order by r.scheduled_for
  limit least(greatest(p_limit, 1), 100);
$$;

-- Before the auth user goes: a confirmed guardian link would lose its guardian (and break the
-- confirmed-link invariant), so the links this person guards are revoked. Their youths return to
-- the guardian step with recorded matches closed, exactly as if the guardian had withdrawn.
create function public.prepare_account_deletion(p_request uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.data_requests
  where id = p_request and kind = 'deletion' and status = 'pending' and scheduled_for <= now()
  for update;
  if v_user is null then
    raise exception 'request_not_due' using errcode = 'no_data_found';
  end if;
  update public.guardians
  set status = 'revoked', revoked_at = now(), invite_token_hash = null, updated_at = now()
  where guardian_user_id = v_user and status <> 'revoked';
  perform private.write_audit('account.deletion_started', 'user', v_user::text,
                              jsonb_build_object('request', p_request));
  return v_user;
end;
$$;

-- After the auth user is deleted (profile, settings, consents, guardian links cascade; events and
-- this request keep no link to the person).
create function public.finish_account_deletion(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_requests
  set status = 'completed', processed_at = now()
  where id = p_request and kind = 'deletion' and status = 'pending' and user_id is null;
  if not found then
    raise exception 'account_still_present' using errcode = 'object_not_in_prerequisite_state';
  end if;
  perform private.write_audit('account.deleted', 'data_request', p_request::text);
end;
$$;

-- Export files whose link has expired: returns their paths for removal and closes the requests.
create function public.expire_data_exports(p_limit integer default 100)
returns setof text
language sql
security definer
set search_path = ''
as $$
  with expired as (
    select id, export_path from public.data_requests
    where kind = 'export' and status = 'ready' and expires_at <= now()
    order by expires_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  )
  update public.data_requests r
  set status = 'completed', export_path = null, expires_at = null
  from expired
  where r.id = expired.id
  returning expired.export_path;
$$;

-- The scheduler's secret lives only in the vault; false wherever the vault is missing.
create function public.check_data_rights_secret(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ok boolean := false;
begin
  if to_regclass('vault.decrypted_secrets') is not null and char_length(p_secret) >= 32 then
    execute 'select exists (select 1 from vault.decrypted_secrets
                            where name = ''data_rights_cron'' and decrypted_secret = $1)'
      into v_ok using p_secret;
  end if;
  return coalesce(v_ok, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the Edge Function (service role) only.
-- ---------------------------------------------------------------------------
revoke execute on function public.due_account_deletions(integer),
  public.prepare_account_deletion(uuid), public.finish_account_deletion(uuid),
  public.expire_data_exports(integer), public.check_data_rights_secret(text)
  from public, anon, authenticated;
grant execute on function public.due_account_deletions(integer),
  public.prepare_account_deletion(uuid), public.finish_account_deletion(uuid),
  public.expire_data_exports(integer), public.check_data_rights_secret(text)
  to service_role;

-- ---------------------------------------------------------------------------
-- The hourly schedule (Supabase: pg_cron, pg_net and the vault; skipped elsewhere).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net')
     and to_regclass('vault.secrets') is not null then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    if not exists (select 1 from vault.secrets where name = 'data_rights_cron') then
      perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'data_rights_cron',
                                  'Authorizes the scheduled data-deletion run (S1-9).');
    end if;
    perform cron.schedule('data-rights', '17 * * * *', $job$
      select net.http_post(
        url := (select value ->> 'functions_url' from public.config where key = 'data_rights')
               || '/data-deletion',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                            where name = 'data_rights_cron')),
        body := '{}'::jsonb)
    $job$);
  end if;
end;
$$;

revoke execute on all functions in schema private from public;
