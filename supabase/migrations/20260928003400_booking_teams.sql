-- Teams and bibs (D-092; spec §6.5 "Teams: A/B plus bibs 1–12, set manually or with the fair squad
-- splitter"). The organizer saves a whole line-up at once: every active player is in team A, team B
-- or not yet placed, with an optional bib. Saving replaces the previous line-up, so the squad
-- splitter's result and a manual edit behave the same. Players see teams and bibs in the match
-- details; the position each player plays is added there for picking teams.

-- p_assignments: [{"player_ref": uuid, "team": "a" | "b" | null, "bib": 1–12 | null}, …]. Players left
-- out aren't placed. A player named twice, an unknown or removed player, a bad team or bib, or a
-- bib used twice is refused as a whole (`invalid_assignment`).
create function public.set_booking_teams(p_booking uuid, p_assignments jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bookings := private.organizer_booking(p_booking);
  v_items jsonb := coalesce(p_assignments, '[]'::jsonb);
begin
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) > 30 then
    raise exception 'invalid_assignment' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('teams:' || v_b.id, interval '1 hour', 60) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_items) a
    where jsonb_typeof(a) <> 'object'
       or coalesce(a ->> 'team', 'a') not in ('a', 'b')
       -- No casts before the shape is known: `or` isn't evaluated in order.
       or (a ->> 'bib' is not null
           and case when a ->> 'bib' ~ '^[0-9]{1,2}$' then (a ->> 'bib')::int not between 1 and 12
                    else true end)
       or not exists (select 1 from public.booking_players bp
                      where bp.booking_id = v_b.id and bp.removed_at is null
                        and bp.player_ref::text = lower(coalesce(a ->> 'player_ref', ''))))
     or (select count(*) from jsonb_array_elements(v_items))
        <> (select count(distinct lower(a ->> 'player_ref')) from jsonb_array_elements(v_items) a)
     or (select count(a ->> 'bib') from jsonb_array_elements(v_items) a)
        <> (select count(distinct a ->> 'bib') from jsonb_array_elements(v_items) a)
  then
    raise exception 'invalid_assignment' using errcode = 'check_violation';
  end if;
  -- Clear first, so a bib moving from one player to another never collides mid-way.
  update public.booking_players set team = null, bib = null
  where booking_id = v_b.id and removed_at is null;
  update public.booking_players bp
  set team = a ->> 'team', bib = (a ->> 'bib')::smallint
  from jsonb_array_elements(v_items) a
  where bp.booking_id = v_b.id and bp.removed_at is null and bp.player_ref::text = lower(a ->> 'player_ref');
  insert into public.events (user_id, name, properties)
  values ((select auth.uid()), 'tool_used', jsonb_build_object('tool', 'teams', 'booking', v_b.id));
  return public.booking_details(v_b.id);
end;
$$;

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
    -- Participants and staff see first names as players chose them, and the position they play
    -- (for picking teams); nothing else about them.
    'players', (select coalesce(jsonb_agg(jsonb_build_object(
                  'name', pr.display_name, 'team', bp.team, 'bib', bp.bib, 'position', pr.position,
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

revoke execute on function public.set_booking_teams(uuid, jsonb) from public, anon;
grant execute on function public.set_booking_teams(uuid, jsonb) to authenticated, service_role;

revoke execute on all functions in schema private from public;
