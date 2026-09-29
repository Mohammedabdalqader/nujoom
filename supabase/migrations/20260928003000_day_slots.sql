-- A field's slots for one Amman day, as the server sees them (D-074; contract §4 addition). The
-- booking sheet shows exactly these, so there is one slot implementation (the same grid rules as
-- slot_error) rather than a copy in every client. States: free, busy (a confirmed booking or
-- block overlaps; never who or why) and past.
create function public.pitch_day_slots(p_pitch uuid, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := (select value from public.config where key = 'booking');
  v_ops public.pitch_operations;
  v_day text;
  v_range jsonb;
  v_minute integer;
  v_close integer;
  v_start timestamptz;
  v_end timestamptz;
  v_slots jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.pitch_is_bookable(p_pitch)
     or (select players_per_side from public.pitches where id = p_pitch) is null then
    raise exception 'pitch_unavailable' using errcode = 'check_violation';
  end if;
  if p_date is null or p_date < private.amman_today() then
    raise exception 'slot_in_past' using errcode = 'check_violation';
  end if;
  if p_date > private.amman_today() + (v_cfg ->> 'horizon_days')::integer - 1 then
    raise exception 'beyond_horizon' using errcode = 'check_violation';
  end if;
  select * into v_ops from public.pitch_operations where pitch_id = p_pitch;
  v_day := (array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[extract(dow from p_date)::integer + 1];
  for v_range in select value from jsonb_array_elements(coalesce(v_ops.opening_hours -> v_day, '[]'::jsonb)) loop
    v_minute := private.hhmm_minutes(v_range ->> 0);
    v_close := private.hhmm_minutes(v_range ->> 1);
    while v_minute + v_ops.slot_minutes <= v_close loop
      v_start := (p_date::timestamp + make_interval(mins => v_minute)) at time zone 'Asia/Amman';
      v_end := v_start + make_interval(mins => v_ops.slot_minutes);
      v_slots := v_slots || jsonb_build_object(
        'starts_at', v_start,
        'ends_at', v_end,
        'state', case
          when v_start < now() then 'past'
          when exists (select 1 from public.bookings b
                       where b.pitch_id = p_pitch and b.status = 'confirmed'
                         and b.during && tstzrange(v_start, v_end, '[)')) then 'busy'
          else 'free' end);
      v_minute := v_minute + v_ops.slot_minutes;
    end loop;
  end loop;
  return jsonb_build_object('date', p_date, 'slot_minutes', v_ops.slot_minutes,
                            'price_per_hour', v_ops.price_per_hour, 'slots', v_slots);
end;
$$;

revoke execute on function public.pitch_day_slots(uuid, date) from public, anon;
grant execute on function public.pitch_day_slots(uuid, date) to authenticated, service_role;

revoke execute on all functions in schema private from public;
