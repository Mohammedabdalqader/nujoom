-- The pitch kitty ("قطية الملعب") (D-095; spec §6.6 "Cost splitter"). The pitch cost (by default the
-- booked price) plus extras, split per player; the organizer marks who paid, in cash or by CliQ.
-- Tracking only: the app never moves money, and stars never pay (D-006.1). The organizer's CliQ
-- alias stays on their own phone (the demo's choice), so the server never holds a payment
-- identifier. Walk-in guests without the app can be added by a short first name. Only the match's
-- players see the kitty.

create table public.booking_kitty (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  -- Whole fils (1 JOD = 1000 fils) so shares never drift; at most 1000 JOD each.
  pitch_cost_fils integer not null check (pitch_cost_fils between 0 and 1000000),
  extras_fils integer not null default 0 check (extras_fils between 0 and 1000000),
  updated_at timestamptz not null default now()
);

create table public.booking_kitty_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default clock_timestamp()
);
create index booking_kitty_guests_booking_idx on public.booking_kitty_guests (booking_id, created_at);

create table public.booking_kitty_payments (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_id uuid references public.booking_kitty_guests (id) on delete cascade,
  method text not null check (method in ('cash', 'cliq')),
  marked_at timestamptz not null default now(),
  check ((user_id is null) <> (guest_id is null))
);
create unique index booking_kitty_payments_user_idx on public.booking_kitty_payments (booking_id, user_id)
  where user_id is not null;
create unique index booking_kitty_payments_guest_idx on public.booking_kitty_payments (guest_id)
  where guest_id is not null;
create index booking_kitty_payments_user_lookup_idx on public.booking_kitty_payments (user_id);

alter table public.booking_kitty enable row level security;
alter table public.booking_kitty_guests enable row level security;
alter table public.booking_kitty_payments enable row level security;
revoke all on table public.booking_kitty, public.booking_kitty_guests, public.booking_kitty_payments
  from anon, authenticated;
grant all on table public.booking_kitty, public.booking_kitty_guests, public.booking_kitty_payments
  to service_role;

-- An active player of a confirmed booking (the organizer is a player too), locked; raises otherwise.
-- Unlike gear, the kitty stays open after the match: people often settle up afterwards.
create function private.kitty_booking(p_booking uuid, p_organizer boolean)
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
  if p_organizer and v_b.organizer_id <> v_uid then
    raise exception 'not_organizer' using errcode = 'insufficient_privilege';
  end if;
  if not private.hit_rate_limit('kitty:' || v_uid, interval '1 hour', 120) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  -- The first open starts from the booked price.
  insert into public.booking_kitty (booking_id, pitch_cost_fils)
  values (v_b.id, coalesce(round(v_b.price_per_hour * v_b.slot_minutes / 60.0 * 1000)::integer, 0))
  on conflict do nothing;
  return v_b;
end;
$$;

create function private.kitty_state(p_booking uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'booking_id', b.id,
    'pitch_cost_fils', k.pitch_cost_fils,
    'extras_fils', k.extras_fils,
    'is_organizer', b.organizer_id = (select auth.uid()),
    -- The match's players first (in the order they joined), then the organizer's guests. `ref`
    -- (a player's per-booking handle or a guest's id) is for the organizer, who marks payments.
    'players', coalesce((
      select jsonb_agg(x.item order by x.ord, x.at)
      from (
        select 0 as ord, bp.joined_at as at, jsonb_build_object(
                 'ref', case when b.organizer_id = (select auth.uid()) then bp.player_ref::text end,
                 'kind', 'player', 'name', pr.display_name, 'is_me', bp.user_id = (select auth.uid()),
                 'paid', (select pay.method from public.booking_kitty_payments pay
                          where pay.booking_id = b.id and pay.user_id = bp.user_id)) as item
        from public.booking_players bp join public.profiles pr on pr.id = bp.user_id
        where bp.booking_id = b.id and bp.removed_at is null
        union all
        select 1, g.created_at, jsonb_build_object(
                 'ref', case when b.organizer_id = (select auth.uid()) then g.id::text end,
                 'kind', 'guest', 'name', g.name, 'is_me', false,
                 'paid', (select pay.method from public.booking_kitty_payments pay where pay.guest_id = g.id))
        from public.booking_kitty_guests g where g.booking_id = b.id
      ) x), '[]'::jsonb))
  from public.bookings b join public.booking_kitty k on k.booking_id = b.id
  where b.id = p_booking
$$;

create function public.booking_kitty(p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.kitty_booking(p_booking, false);
begin
  return private.kitty_state(v_b.id);
end;
$$;

create function public.set_kitty_costs(p_booking uuid, p_pitch_cost_fils integer, p_extras_fils integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.kitty_booking(p_booking, true);
begin
  if p_pitch_cost_fils is null or p_pitch_cost_fils not between 0 and 1000000
     or p_extras_fils is null or p_extras_fils not between 0 and 1000000 then
    raise exception 'invalid_amount' using errcode = 'check_violation';
  end if;
  update public.booking_kitty
  set pitch_cost_fils = p_pitch_cost_fils, extras_fils = p_extras_fils, updated_at = now()
  where booking_id = v_b.id;
  return private.kitty_state(v_b.id);
end;
$$;

-- A walk-in without the app, by a short first name (at most 12 guests).
create function public.add_kitty_guest(p_booking uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.kitty_booking(p_booking, true);
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
begin
  if v_name is null or char_length(v_name) > 30 then
    raise exception 'invalid_guest_name' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.booking_kitty_guests where booking_id = v_b.id) >= 12 then
    raise exception 'too_many_guests' using errcode = 'check_violation';
  end if;
  insert into public.booking_kitty_guests (booking_id, name) values (v_b.id, v_name);
  return private.kitty_state(v_b.id);
end;
$$;

create function public.remove_kitty_guest(p_booking uuid, p_guest uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.kitty_booking(p_booking, true);
begin
  delete from public.booking_kitty_guests where id = p_guest and booking_id = v_b.id;
  return private.kitty_state(v_b.id);
end;
$$;

-- The organizer marks who paid (`cash` or `cliq`), or clears it (null). `p_ref` is a player's
-- per-booking handle or a guest's id, as `booking_kitty` gives them to the organizer.
create function public.mark_kitty_payment(p_booking uuid, p_ref uuid, p_method text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.kitty_booking(p_booking, true);
  v_user uuid;
  v_guest uuid;
begin
  if p_method is not null and p_method not in ('cash', 'cliq') then
    raise exception 'invalid_payment_method' using errcode = 'check_violation';
  end if;
  select user_id into v_user from public.booking_players
  where booking_id = v_b.id and player_ref = p_ref and removed_at is null;
  if v_user is null then
    select id into v_guest from public.booking_kitty_guests where booking_id = v_b.id and id = p_ref;
    if v_guest is null then
      raise exception 'not_a_player' using errcode = 'check_violation';
    end if;
  end if;
  delete from public.booking_kitty_payments
  where booking_id = v_b.id and (user_id = v_user or guest_id = v_guest);
  if p_method is not null then
    insert into public.booking_kitty_payments (booking_id, user_id, guest_id, method)
    values (v_b.id, v_user, v_guest, p_method);
    insert into public.events (user_id, name, properties)
    values ((select auth.uid()), 'tool_used', jsonb_build_object('tool', 'kitty', 'booking', v_b.id));
  end if;
  return private.kitty_state(v_b.id);
end;
$$;

-- The data export includes a person's payment marks (coverage guard in pgTAP 050).
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
    'kitty_payments', (select coalesce(jsonb_agg(jsonb_build_object(
                         'venue', coalesce(f.name_ar, f.name_en), 'starts_at', lower(b.during),
                         'method', pay.method, 'marked_at', pay.marked_at) order by lower(b.during)), '[]'::jsonb)
                       from public.booking_kitty_payments pay
                       join public.bookings b on b.id = pay.booking_id
                       join public.pitches p on p.id = b.pitch_id
                       join public.facilities f on f.id = p.facility_id
                       where pay.user_id = p_user),
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

revoke execute on function public.booking_kitty(uuid), public.set_kitty_costs(uuid, integer, integer),
  public.add_kitty_guest(uuid, text), public.remove_kitty_guest(uuid, uuid),
  public.mark_kitty_payment(uuid, uuid, text)
  from public, anon;
grant execute on function public.booking_kitty(uuid), public.set_kitty_costs(uuid, integer, integer),
  public.add_kitty_guest(uuid, text), public.remove_kitty_guest(uuid, uuid),
  public.mark_kitty_payment(uuid, uuid, text)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
