-- Match invites and joining (D-083; contract agentic_system/contracts/invites.md, G3a).
-- One reusable join link per booking, readable and resettable by the organizer only; previews that
-- never show who plays to someone who only holds the link; join rules in one place, answered in
-- order; the capacity check and the insert under a lock on the booking row, so two people racing
-- for the last spot can't both get in; leave and remove, with a removal keeping someone out of the
-- same link.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The token is stored, not hashed: the organizer re-shares the same link (guardian and staff links
-- are one-time and hashed). 32 random bytes from two v4 UUIDs, base64url without padding.
create table public.booking_invites (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  -- The exact moment, not the transaction's start: links are compared with removals (join rule 4).
  created_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz
);
create unique index booking_invites_active_idx on public.booking_invites (booking_id)
  where revoked_at is null;

alter table public.booking_invites enable row level security;
revoke all on table public.booking_invites from anon, authenticated;
grant all on table public.booking_invites to service_role;

-- An opaque per-booking handle for removing a player; user ids never leave the server. A row whose
-- removed_by is the player themselves is a leave; anyone else's is a removal.
alter table public.booking_players add column player_ref uuid not null default gen_random_uuid();
create unique index booking_players_ref_idx on public.booking_players (player_ref);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.new_invite_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(rtrim(encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'),
                                'base64'), '='), '+/', '-_')
$$;

-- The active link a token names, or null (unknown and reset look the same).
create function private.active_invite(p_token text)
returns public.booking_invites
language sql
stable
security definer
set search_path = ''
as $$
  select i.* from public.booking_invites i
  where i.token = coalesce(p_token, '') and i.revoked_at is null
$$;

create function private.booking_capacity(p_booking uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select p.players_per_side * 2 + 2
  from public.bookings b join public.pitches p on p.id = b.pitch_id
  where b.id = p_booking
$$;

create function private.active_players(p_booking uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.booking_players
  where booking_id = p_booking and removed_at is null
$$;

-- Why this person can't join through this link right now, or null when they can (contract §3; the
-- link itself is checked by the caller). Rule order is the answer order. `already_joined` comes
-- first so joining twice is a success, not an error.
create function private.join_blocker(p_invite public.booking_invites, p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
  v_row public.booking_players;
begin
  select * into v_b from public.bookings where id = p_invite.booking_id;
  select * into v_row from public.booking_players where booking_id = v_b.id and user_id = p_user;
  if v_row.user_id is not null and v_row.removed_at is null then
    return 'already_joined';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and onboarded_at is not null) then
    return 'not_onboarded';
  end if;
  if v_b.status <> 'confirmed' then
    return 'cancelled';
  end if;
  if lower(v_b.during) <= now() then
    return 'started';
  end if;
  -- Removed by the organizer while this link was already out: this link can't bring them back.
  if v_row.removed_at is not null and v_row.removed_by is distinct from p_user
     and p_invite.created_at <= v_row.removed_at then
    return 'removed';
  end if;
  -- A youth's match stays within the youth age band (spec §7 keeps friendships and "missing one"
  -- in-band; the owner may relax this for links, B-Q2). Youth may join adults' matches.
  if private.is_youth(v_b.organizer_id) and not private.is_youth(p_user) then
    return 'youth_only';
  end if;
  if v_b.recorded and not private.can_join_recorded_matches(p_user) then
    if private.is_youth(p_user)
       and not exists (select 1 from public.guardians g where g.youth_user_id = p_user and g.status = 'confirmed') then
      return 'guardian_required';
    end if;
    return 'recording_consent_required';
  end if;
  if private.active_players(v_b.id) >= private.booking_capacity(v_b.id) then
    return 'full';
  end if;
  return null;
end;
$$;

-- The organizer of a booking that can still take players, locked; raises otherwise.
create function private.organizer_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null or not private.can_see_booking(p_booking) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_b.organizer_id is distinct from (select auth.uid()) then
    raise exception 'not_organizer' using errcode = 'insufficient_privilege';
  end if;
  if v_b.status <> 'confirmed' then
    raise exception 'booking_cancelled' using errcode = 'check_violation';
  end if;
  if lower(v_b.during) <= now() then
    raise exception 'booking_started' using errcode = 'check_violation';
  end if;
  return v_b;
end;
$$;

-- ---------------------------------------------------------------------------
-- The organizer's link
-- ---------------------------------------------------------------------------

create function public.booking_invite(p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.organizer_booking(p_booking);
  v_i public.booking_invites;
begin
  select * into v_i from public.booking_invites where booking_id = v_b.id and revoked_at is null;
  if v_i.id is null then
    insert into public.booking_invites (booking_id, token) values (v_b.id, private.new_invite_token())
    returning * into v_i;
  end if;
  return jsonb_build_object('token', v_i.token, 'created_at', v_i.created_at);
end;
$$;

create function public.reset_booking_invite(p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.organizer_booking(p_booking);
  v_i public.booking_invites;
begin
  if not private.hit_rate_limit('invite_reset:' || v_b.id, interval '1 day', 10) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  update public.booking_invites set revoked_at = now() where booking_id = v_b.id and revoked_at is null;
  insert into public.booking_invites (booking_id, token) values (v_b.id, private.new_invite_token())
  returning * into v_i;
  return jsonb_build_object('token', v_i.token, 'created_at', v_i.created_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- Previews
-- ---------------------------------------------------------------------------

-- What the join screen shows (contract §5): the receipt without people, room left, "invited by"
-- (an adult organizer's display name only, spec §7), and whether this person can join. No roster.
create function public.booking_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_i public.booking_invites;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  v_i := private.active_invite(p_token);
  if v_i.id is null then
    raise exception 'invite_invalid' using errcode = 'no_data_found';
  end if;
  v_reason := private.join_blocker(v_i, v_uid);
  return private.booking_receipt(v_i.booking_id) || jsonb_build_object(
    'capacity', private.booking_capacity(v_i.booking_id),
    'open_spots', greatest(private.booking_capacity(v_i.booking_id) - private.active_players(v_i.booking_id), 0),
    'invited_by', (select pr.display_name from public.bookings b join public.profiles pr on pr.id = b.organizer_id
                   where b.id = v_i.booking_id and not private.is_youth(pr.id)),
    'can_join', v_reason is null,
    'reason', v_reason);
end;
$$;

-- The public web page (contract §4): where and when, and room left. No names, price or players. A
-- booking organized by a youth shows only that the link works: no place or time either (§7).
create function public.booking_preview_public(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_i public.booking_invites := private.active_invite(p_token);
  v_youth boolean;
begin
  if v_i.id is null then
    raise exception 'invite_invalid' using errcode = 'no_data_found';
  end if;
  select private.is_youth(b.organizer_id) into v_youth from public.bookings b where b.id = v_i.booking_id;
  if v_youth then
    return jsonb_build_object('details_hidden', true);
  end if;
  return (
    select jsonb_build_object(
      'details_hidden', false,
      'status', b.status,
      'starts_at', lower(b.during),
      'ends_at', upper(b.during),
      'venue', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
      'field', case when p.label_ar is null and p.label_en is null then null
                    else jsonb_build_object('ar', p.label_ar, 'en', p.label_en) end,
      'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en) from public.cities c where c.id = f.city_id),
      'players_per_side', p.players_per_side,
      'recorded', b.recorded,
      'open_spots', greatest(private.booking_capacity(b.id) - private.active_players(b.id), 0))
    from public.bookings b
    join public.pitches p on p.id = b.pitch_id
    join public.facilities f on f.id = p.facility_id
    where b.id = v_i.booking_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Join, leave, remove
-- ---------------------------------------------------------------------------

create function public.join_booking(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_i public.booking_invites;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  -- Before the token lookup, so guessing tokens is slow too.
  if not private.hit_rate_limit('join:' || v_uid, interval '1 hour', 30) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  v_i := private.active_invite(p_token);
  if v_i.id is null then
    raise exception 'invite_invalid' using errcode = 'no_data_found';
  end if;
  -- One join at a time per booking: the room count and the insert can't interleave. Cancelling
  -- takes the same lock.
  perform 1 from public.bookings where id = v_i.booking_id for update;
  v_reason := private.join_blocker(v_i, v_uid);
  if v_reason = 'already_joined' then
    return private.booking_receipt(v_i.booking_id);
  end if;
  if v_reason is not null then
    raise exception '%', case v_reason when 'cancelled' then 'booking_cancelled'
                                        when 'started' then 'booking_started'
                                        when 'removed' then 'removed_from_booking'
                                        when 'full' then 'booking_full'
                                        when 'youth_only' then 'youth_only_match'
                                        else v_reason end
      using errcode = case when v_reason in ('not_onboarded', 'guardian_required', 'recording_consent_required',
                                             'youth_only')
                           then 'insufficient_privilege' else 'check_violation' end;
  end if;
  insert into public.booking_players (booking_id, user_id) values (v_i.booking_id, v_uid)
  on conflict (booking_id, user_id) do update
    set removed_at = null, removed_by = null, team = null, bib = null, joined_at = now();
  insert into public.events (user_id, name, properties)
  values (v_uid, 'player_joined', jsonb_build_object('booking', v_i.booking_id));
  return private.booking_receipt(v_i.booking_id);
end;
$$;

-- A player (not the organizer, who cancels instead) leaves before kick-off. They may come back
-- through the link while there's room.
create function public.leave_booking(p_booking uuid)
returns jsonb
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
  if v_b.id is null or not private.can_see_booking(p_booking) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_b.organizer_id = v_uid then
    raise exception 'organizer_cannot_leave' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.booking_players
                 where booking_id = p_booking and user_id = v_uid and removed_at is null) then
    raise exception 'not_a_player' using errcode = 'check_violation';
  end if;
  if lower(v_b.during) <= now() then
    raise exception 'booking_started' using errcode = 'check_violation';
  end if;
  update public.booking_players set removed_at = now(), removed_by = v_uid, team = null, bib = null
  where booking_id = p_booking and user_id = v_uid;
  return private.booking_receipt(p_booking);
end;
$$;

-- The organizer removes a player before kick-off. The spot frees; the same link won't let them
-- back in (a reset link would).
create function public.remove_player(p_booking uuid, p_player_ref uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.organizer_booking(p_booking);
  v_row public.booking_players;
begin
  select * into v_row from public.booking_players
  where booking_id = v_b.id and player_ref = p_player_ref and removed_at is null;
  if v_row.user_id is null then
    raise exception 'not_a_player' using errcode = 'check_violation';
  end if;
  if v_row.user_id = v_b.organizer_id then
    raise exception 'organizer_cannot_leave' using errcode = 'check_violation';
  end if;
  update public.booking_players
  set removed_at = clock_timestamp(), removed_by = v_b.organizer_id, team = null, bib = null
  where booking_id = v_b.id and user_id = v_row.user_id;
  return public.booking_details(v_b.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Details: room left, "me", and remove handles for the organizer only
-- ---------------------------------------------------------------------------

create or replace function public.booking_details(p_booking uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_staff boolean;
  v_organizer boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.can_see_booking(p_booking) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  select private.is_facility_staff(p.facility_id), b.organizer_id = v_uid
  into v_staff, v_organizer
  from public.bookings b join public.pitches p on p.id = b.pitch_id where b.id = p_booking;
  return private.booking_receipt(p_booking) || jsonb_build_object(
    -- Participants and staff see first names as players chose them; nothing else about them.
    'players', (select coalesce(jsonb_agg(jsonb_build_object(
                  'name', pr.display_name, 'team', bp.team, 'bib', bp.bib,
                  'is_organizer', bp.user_id = b.organizer_id,
                  'is_me', bp.user_id = v_uid,
                  'player_ref', case when v_organizer then bp.player_ref end) order by bp.joined_at), '[]'::jsonb)
                from public.booking_players bp
                join public.profiles pr on pr.id = bp.user_id
                join public.bookings b on b.id = bp.booking_id
                where bp.booking_id = p_booking and bp.removed_at is null),
    'capacity', private.booking_capacity(p_booking),
    'open_spots', greatest(private.booking_capacity(p_booking) - private.active_players(p_booking), 0),
    'contact_phone', case when v_staff or v_organizer then
                       (select contact_phone from public.booking_private where booking_id = p_booking) end,
    'walk_in_name', case when v_staff then
                      (select walk_in_name from public.booking_private where booking_id = p_booking) end);
end;
$$;

revoke execute on function public.booking_invite(uuid), public.reset_booking_invite(uuid),
  public.booking_preview(text), public.join_booking(text), public.leave_booking(uuid),
  public.remove_player(uuid, uuid), public.booking_preview_public(text)
  from public, anon;
grant execute on function public.booking_invite(uuid), public.reset_booking_invite(uuid),
  public.booking_preview(text), public.join_booking(text), public.leave_booking(uuid),
  public.remove_player(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.booking_preview_public(text) to anon, authenticated, service_role;

revoke execute on all functions in schema private from public;
