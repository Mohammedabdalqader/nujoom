-- Opening hours (D-063): the stored shape is now validated, saving a price no longer wipes the
-- hours, and a schedule can only be switched on once it has hours to book.
--
-- Shape (Amman wall-clock, as isValidOpeningHours in @nujoom/shared):
--   {"sun": [["16:00", "24:00"]], "fri": [["10:00", "13:00"], ["15:00", "23:00"]], ...}
-- Keys are sun..sat; each day is a list of [start, end] ranges, HH:MM in 24-hour time, "24:00"
-- allowed as an end (midnight), each range ending after it starts, in order and not overlapping.
-- A day that is missing or has no ranges is closed.

create function private.valid_opening_hours(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_day text;
  v_ranges jsonb;
  v_range jsonb;
  v_prev_end integer;
  v_start integer;
  v_end integer;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  for v_day, v_ranges in select key, value from jsonb_each(p) loop
    if v_day not in ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')
       or jsonb_typeof(v_ranges) <> 'array' then
      return false;
    end if;
    v_prev_end := -1;
    for v_range in select value from jsonb_array_elements(v_ranges) loop
      if jsonb_typeof(v_range) <> 'array' or jsonb_array_length(v_range) <> 2
         or jsonb_typeof(v_range -> 0) <> 'string' or jsonb_typeof(v_range -> 1) <> 'string'
         or (v_range ->> 0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or ((v_range ->> 1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and (v_range ->> 1) <> '24:00') then
        return false;
      end if;
      v_start := split_part(v_range ->> 0, ':', 1)::integer * 60 + split_part(v_range ->> 0, ':', 2)::integer;
      v_end := split_part(v_range ->> 1, ':', 1)::integer * 60 + split_part(v_range ->> 1, ':', 2)::integer;
      if v_end <= v_start or v_start < v_prev_end then
        return false;
      end if;
      v_prev_end := v_end;
    end loop;
  end loop;
  return true;
end;
$$;

-- True when at least one day has a range.
create function private.has_opening_hours(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(p) = 'object'
                  and exists (select 1 from jsonb_each(p) d
                              where jsonb_typeof(d.value) = 'array' and jsonb_array_length(d.value) > 0),
                  false);
$$;

alter table public.pitch_operations
  add constraint pitch_operations_opening_hours_valid check (private.valid_opening_hours(opening_hours));

-- Operator-confirmed facts and operations. Hours are optional in a save: when the operations leave
-- out "opening_hours", the stored hours are kept (a price change never wipes them).
create or replace function public.owner_confirm_field(p_pitch uuid, p_facts jsonb default '{}'::jsonb,
                                                      p_operations jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
begin
  if v_facility is null or not private.is_facility_staff(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if p_operations ? 'opening_hours' and not private.valid_opening_hours(p_operations -> 'opening_hours') then
    raise exception 'invalid_opening_hours' using errcode = 'check_violation';
  end if;
  perform private.apply_pitch_facts(p_pitch, p_facts, 'operator');
  if p_operations is not null then
    insert into public.pitch_operations (pitch_id, price_per_hour, price_note_ar, price_note_en,
                                         slot_minutes, opening_hours, confirmed_by, confirmed_at)
    values (p_pitch, (p_operations ->> 'price_per_hour')::numeric, p_operations ->> 'price_note_ar',
            p_operations ->> 'price_note_en', (p_operations ->> 'slot_minutes')::smallint,
            coalesce(p_operations -> 'opening_hours', '{}'::jsonb), (select auth.uid()), now())
    on conflict (pitch_id) do update
    set price_per_hour = excluded.price_per_hour, price_note_ar = excluded.price_note_ar,
        price_note_en = excluded.price_note_en, slot_minutes = excluded.slot_minutes,
        opening_hours = case when p_operations ? 'opening_hours' then excluded.opening_hours
                             else public.pitch_operations.opening_hours end,
        confirmed_by = excluded.confirmed_by, confirmed_at = now();
  end if;
  perform private.review(v_facility, p_pitch, 'operator_confirmed', null,
                         jsonb_build_object('facts', p_facts, 'operations', p_operations), null);
end;
$$;

-- Switching the schedule on needs hours to book; pausing is always allowed.
create or replace function public.owner_set_schedule_active(p_pitch uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
  v_hours jsonb;
begin
  if v_facility is null or not private.is_facility_staff(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  select opening_hours into v_hours from public.pitch_operations where pitch_id = p_pitch;
  if not found then
    raise exception 'no_operations' using errcode = 'no_data_found';
  end if;
  if p_active and not private.has_opening_hours(v_hours) then
    raise exception 'no_opening_hours' using errcode = 'check_violation';
  end if;
  update public.pitch_operations set schedule_active = p_active where pitch_id = p_pitch;
  perform private.review(v_facility, p_pitch, case when p_active then 'schedule_on' else 'schedule_off' end,
                         null, null, null);
end;
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.valid_opening_hours(jsonb), private.has_opening_hours(jsonb)
  to service_role;
