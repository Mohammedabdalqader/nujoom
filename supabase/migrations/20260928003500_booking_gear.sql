-- The match gear checklist (D-093; spec §6.6 "Gear checklist (عتاد المباراة)"). Each booking gets the
-- default items (ball, bibs, water, whistle/referee, first-aid kit) the first time a player opens
-- it; the organizer can add short custom items and remove any. A player claims an item ("I'll bring
-- it", which also marks it ready) or ticks it ready; progress is what's ready. Only the match's
-- players see it, and only by display name. Custom names are short labels (40 characters), never
-- messages (spec §7).

create type public.gear_kind as enum ('ball', 'bibs', 'water', 'referee', 'firstaid', 'booking', 'custom');

create table public.booking_gear_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.gear_kind not null,
  name text check (name is null or char_length(name) between 1 and 40),
  assignee_id uuid references public.profiles (id) on delete set null,
  ready boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  check ((kind = 'custom') = (name is not null))
);
create unique index booking_gear_items_kind_idx on public.booking_gear_items (booking_id, kind)
  where kind <> 'custom';
create index booking_gear_items_booking_idx on public.booking_gear_items (booking_id, created_at);
create index booking_gear_items_assignee_idx on public.booking_gear_items (assignee_id);

alter table public.booking_gear_items enable row level security;
revoke all on table public.booking_gear_items from anon, authenticated;
grant all on table public.booking_gear_items to service_role;

-- An active player of a booking that hasn't ended (the organizer is a player too), locked; the
-- booking row is returned. Raises otherwise.
create function private.gear_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null or not exists (select 1 from public.booking_players
                                   where booking_id = p_booking and user_id = v_uid and removed_at is null) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_b.status <> 'confirmed' then
    raise exception 'booking_cancelled' using errcode = 'check_violation';
  end if;
  if upper(v_b.during) <= now() then
    raise exception 'booking_ended' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('gear:' || v_uid, interval '1 hour', 120) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  return v_b;
end;
$$;

create function private.gear_list(p_booking uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'booking_id', b.id,
    'starts_at', lower(b.during),
    'players_per_side', p.players_per_side,
    'is_organizer', b.organizer_id = (select auth.uid()),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', g.id, 'kind', g.kind, 'name', g.name, 'ready', g.ready,
                -- Players see who brings what by display name; no ids.
                'assignee', case when g.assignee_id is null then null
                                 else jsonb_build_object('name', pr.display_name,
                                                         'is_me', g.assignee_id = (select auth.uid())) end)
                order by g.kind = 'custom', g.kind, g.created_at), '[]'::jsonb)
              from public.booking_gear_items g
              left join public.profiles pr on pr.id = g.assignee_id
              where g.booking_id = b.id))
  from public.bookings b join public.pitches p on p.id = b.pitch_id
  where b.id = p_booking
$$;

-- The checklist; the first open fills in the default items.
create function public.booking_gear(p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.gear_booking(p_booking);
begin
  insert into public.booking_gear_items (booking_id, kind)
  select v_b.id, k::public.gear_kind from unnest(array['ball', 'bibs', 'water', 'referee', 'firstaid']) k
  where not exists (select 1 from public.booking_gear_items where booking_id = v_b.id)
  on conflict do nothing;
  return private.gear_list(v_b.id);
end;
$$;

-- "I'll bring it" (also marks it ready), or let it go. Someone else's item can't be taken over; the
-- organizer can free any item.
create function public.claim_gear_item(p_item uuid, p_claim boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_g public.booking_gear_items;
  v_b public.bookings;
begin
  select * into v_g from public.booking_gear_items where id = p_item;
  if v_g.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  v_b := private.gear_booking(v_g.booking_id);
  select * into v_g from public.booking_gear_items where id = p_item for update;
  if coalesce(p_claim, false) then
    if v_g.assignee_id is not null and v_g.assignee_id <> v_uid then
      raise exception 'gear_taken' using errcode = 'check_violation';
    end if;
    update public.booking_gear_items set assignee_id = v_uid, ready = true where id = p_item;
    insert into public.events (user_id, name, properties)
    values (v_uid, 'tool_used', jsonb_build_object('tool', 'gear', 'booking', v_b.id));
  else
    if v_g.assignee_id is not null and v_g.assignee_id <> v_uid and v_b.organizer_id <> v_uid then
      raise exception 'gear_taken' using errcode = 'check_violation';
    end if;
    update public.booking_gear_items set assignee_id = null, ready = false where id = p_item;
  end if;
  return private.gear_list(v_b.id);
end;
$$;

-- Any player ticks an item ready or not ready (the demo's checklist).
create function public.set_gear_ready(p_item uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g public.booking_gear_items;
  v_b public.bookings;
begin
  select * into v_g from public.booking_gear_items where id = p_item;
  if v_g.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  v_b := private.gear_booking(v_g.booking_id);
  update public.booking_gear_items set ready = coalesce(p_ready, false) where id = p_item;
  return private.gear_list(v_b.id);
end;
$$;

-- The organizer adds a short custom item (at most 15 items in all).
create function public.add_gear_item(p_booking uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.gear_booking(p_booking);
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
begin
  if v_b.organizer_id <> (select auth.uid()) then
    raise exception 'not_organizer' using errcode = 'insufficient_privilege';
  end if;
  if v_name is null or char_length(v_name) > 40 then
    raise exception 'invalid_gear_name' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.booking_gear_items where booking_id = v_b.id) >= 15 then
    raise exception 'too_many_gear_items' using errcode = 'check_violation';
  end if;
  insert into public.booking_gear_items (booking_id, kind, name) values (v_b.id, 'custom', v_name);
  return private.gear_list(v_b.id);
end;
$$;

create function public.remove_gear_item(p_item uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g public.booking_gear_items;
  v_b public.bookings;
begin
  select * into v_g from public.booking_gear_items where id = p_item;
  if v_g.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  v_b := private.gear_booking(v_g.booking_id);
  if v_b.organizer_id <> (select auth.uid()) then
    raise exception 'not_organizer' using errcode = 'insufficient_privilege';
  end if;
  delete from public.booking_gear_items where id = p_item;
  return private.gear_list(v_b.id);
end;
$$;

-- The data export includes the items a person said they'd bring (coverage guard in pgTAP 050).
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
    'gear_claimed', (select coalesce(jsonb_agg(jsonb_build_object(
                       'venue', coalesce(f.name_ar, f.name_en), 'starts_at', lower(b.during),
                       'item', g.kind, 'name', g.name, 'ready', g.ready) order by lower(b.during)), '[]'::jsonb)
                     from public.booking_gear_items g
                     join public.bookings b on b.id = g.booking_id
                     join public.pitches p on p.id = b.pitch_id
                     join public.facilities f on f.id = p.facility_id
                     where g.assignee_id = p_user),
    'favorite_pitches', (select coalesce(jsonb_agg(jsonb_build_object(
                           'venue', coalesce(f.name_ar, f.name_en), 'field', coalesce(p.label_ar, p.label_en),
                           'created_at', fav.created_at) order by fav.created_at), '[]'::jsonb)
                         from public.pitch_favorites fav
                         join public.pitches p on p.id = fav.pitch_id
                         join public.facilities f on f.id = p.facility_id
                         where fav.user_id = p_user),
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

revoke execute on function public.booking_gear(uuid), public.claim_gear_item(uuid, boolean),
  public.set_gear_ready(uuid, boolean), public.add_gear_item(uuid, text), public.remove_gear_item(uuid)
  from public, anon;
grant execute on function public.booking_gear(uuid), public.claim_gear_item(uuid, boolean),
  public.set_gear_ready(uuid, boolean), public.add_gear_item(uuid, text), public.remove_gear_item(uuid)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
