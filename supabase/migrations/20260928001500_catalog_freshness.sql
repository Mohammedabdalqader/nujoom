-- Catalog freshness (D-050; contract §3.1, test 4a). A verified field must stay truthful: if it
-- has been paused, or its operator-confirmed facts are old, it first appears in the admin's
-- "stale" list, and after a grace period a daily job removes the badge (recorded as the system).
-- The numbers live in config.catalog_freshness and are PROPOSALS, not an approved SLA.

-- When a schedule was paused (null while active). Operators resuming, or re-confirming their
-- field (owner_confirm_field refreshes confirmed_at), clears the warning.
alter table public.pitch_operations add column paused_at timestamptz;
update public.pitch_operations set paused_at = now() where not schedule_active;

create function private.track_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.schedule_active then
    new.paused_at := null;
  elsif tg_op = 'INSERT' or old.schedule_active then
    new.paused_at := now();
  end if;
  return new;
end;
$$;
create trigger pitch_operations_track_pause before insert or update of schedule_active
  on public.pitch_operations for each row execute function private.track_pause();

create function private.freshness_days(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (value ->> p_key)::integer from public.config where key = 'catalog_freshness';
$$;

-- Verified fields and how stale they are: `paused` (days paused) or `facts_old` (days since the
-- operator last confirmed). `due` means the grace period has passed too.
create function private.stale_verified_fields()
returns table (pitch_id uuid, facility_id uuid, reason text, days integer, due boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with limits as (
    select private.freshness_days('pause_days') as pause_days,
           private.freshness_days('confirm_days') as confirm_days,
           private.freshness_days('grace_days') as grace_days
  ), fields as (
    select p.id, p.facility_id, o.paused_at, o.confirmed_at
    from public.pitches p
    join public.pitch_operations o on o.pitch_id = p.id
    where p.participation = 'verified'
  )
  select f.id, f.facility_id, 'paused',
         (current_date - f.paused_at::date),
         (current_date - f.paused_at::date) > l.pause_days + l.grace_days
  from fields f, limits l
  where f.paused_at is not null and (current_date - f.paused_at::date) > l.pause_days
  union all
  select f.id, f.facility_id, 'facts_old',
         (current_date - f.confirmed_at::date),
         (current_date - f.confirmed_at::date) > l.confirm_days + l.grace_days
  from fields f, limits l
  where (current_date - f.confirmed_at::date) > l.confirm_days;
$$;

-- The admin's warning list: verified fields that need a follow-up (and whether they are due).
create function public.admin_stale_listings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object(
            'pitch_id', s.pitch_id, 'facility_id', s.facility_id, 'reason', s.reason,
            'days', s.days, 'due', s.due) order by s.due desc, s.days desc), '[]'::jsonb)
          from private.stale_verified_fields() s);
end;
$$;

-- The daily job: removes the badge from every field whose grace period has passed. Idempotent.
create function public.run_catalog_freshness()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in select distinct on (s.pitch_id) s.pitch_id, s.reason
               from private.stale_verified_fields() s
               where s.due
               order by s.pitch_id, s.reason desc loop
    update public.pitches set participation = 'not_verified', verified_at = null
    where id = v_row.pitch_id and participation = 'verified';
    if found then
      insert into public.verification_events (pitch_id, from_state, to_state, reason, recorded_by)
      values (v_row.pitch_id, 'verified', 'not_verified',
              case v_row.reason when 'paused' then 'stale_paused' else 'stale_facts' end, null);
      perform private.write_audit('catalog.participation_not_verified', 'pitch', v_row.pitch_id::text,
                                  jsonb_build_object('reason', 'freshness_' || v_row.reason));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.admin_stale_listings(), public.run_catalog_freshness() from public, anon;
grant execute on function public.admin_stale_listings() to authenticated, service_role;
revoke execute on function public.run_catalog_freshness() from authenticated;
grant execute on function public.run_catalog_freshness() to service_role;

-- Daily at 03:10 Amman (00:10 UTC); skipped where pg_cron is missing.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('catalog-freshness', '10 0 * * *', 'select public.run_catalog_freshness()');
  end if;
end;
$$;

revoke execute on all functions in schema private from public;
