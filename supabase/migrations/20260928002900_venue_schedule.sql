-- Booking transactions, part 2: the venue's side (D-072; contract §4). The calendar staff work
-- from, phone and walk-in bookings, and owner blocks (maintenance, private events). Everything
-- shares the exclusion constraint and the per-field lock of part 1 (D-071), so a player, a walk-in
-- and a block can never land on the same time.

-- Why time is blocked (blocks only).
alter table public.bookings add column block_reason public.booking_cancel_reason;
alter table public.bookings add constraint bookings_block_reason
  check ((kind = 'block') = (block_reason is not null)
         and (block_reason is null or block_reason in ('venue_closed', 'maintenance', 'weather', 'staff_other')));

-- The staff calendar: every booking and block on the venue's fields in a window (≤ 31 days),
-- cancelled ones included so staff can see what changed. Organizer names, contact phones and
-- walk-in names are for the venue's own staff only.
create function public.venue_schedule(p_facility uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_facility_staff(p_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'invalid_window' using errcode = 'invalid_parameter_value';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', b.id,
             'pitch_id', b.pitch_id,
             'field', case when p.label_ar is null and p.label_en is null then null
                           else jsonb_build_object('ar', p.label_ar, 'en', p.label_en) end,
             'kind', b.kind,
             'status', b.status,
             'starts_at', lower(b.during),
             'ends_at', upper(b.during),
             'organizer', (select pr.display_name from public.profiles pr where pr.id = b.organizer_id),
             'walk_in_name', bp.walk_in_name,
             'contact_phone', bp.contact_phone,
             'players', (select count(*) from public.booking_players pl
                         where pl.booking_id = b.id and pl.removed_at is null),
             'recorded', b.recorded,
             'price_per_hour', b.price_per_hour,
             'block_reason', b.block_reason,
             'cancel_reason', b.cancel_reason) order by lower(b.during), p.created_at), '[]'::jsonb)
    from public.bookings b
    join public.pitches p on p.id = b.pitch_id
    left join public.booking_private bp on bp.booking_id = b.id
    where p.facility_id = p_facility and b.during && tstzrange(p_from, p_to, '[)'));
end;
$$;

-- A phone or walk-in booking made by the venue's staff: same slot rules as the app (no organizer
-- limit), a name to recognise the customer by, an optional phone, the price snapshot.
create function public.create_manual_booking(p_pitch uuid, p_starts_at timestamptz, p_walk_in_name text,
                                             p_contact_phone text default null,
                                             p_client_request_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
  v_name text := nullif(regexp_replace(btrim(coalesce(p_walk_in_name, '')), '\s+', ' ', 'g'), '');
  v_phone text := nullif(btrim(coalesce(p_contact_phone, '')), '');
  v_existing uuid;
  v_ops public.pitch_operations;
  v_error text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_facility is null or not private.is_facility_staff(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if p_client_request_id is not null then
    select id into v_existing from public.bookings
    where created_by = v_uid and client_request_id = p_client_request_id;
    if v_existing is not null then
      return private.booking_receipt(v_existing);
    end if;
  end if;
  if v_name is null or char_length(v_name) > 60 then
    raise exception 'invalid_walk_in_name' using errcode = 'check_violation';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid_phone' using errcode = 'check_violation';
  end if;
  select * into v_ops from public.pitch_operations where pitch_id = p_pitch;
  v_error := private.slot_error(p_pitch, p_starts_at, v_ops.slot_minutes, 'manual');
  if v_error is not null then
    raise exception '%', v_error using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('manual_booking:' || v_uid, interval '1 hour', 100) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  perform pg_advisory_xact_lock(hashtext('booking_pitch:' || p_pitch::text));
  begin
    insert into public.bookings (pitch_id, kind, during, created_by, recorded, price_per_hour, slot_minutes,
                                 client_request_id)
    values (p_pitch, 'manual',
            tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_ops.slot_minutes), '[)'),
            v_uid, false, v_ops.price_per_hour, v_ops.slot_minutes, p_client_request_id)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'check_violation';
  end;
  insert into public.booking_private (booking_id, contact_phone, walk_in_name) values (v_id, v_phone, v_name);
  perform private.write_audit('venue.manual_booking', 'facility', v_facility::text, jsonb_build_object('booking', v_id));
  return private.booking_receipt(v_id);
end;
$$;

-- An owner takes time off sale: whole slots, inside the opening hours, up to 90 days ahead. It is
-- refused over existing confirmed bookings (cancel those first, with a reason). Unblocking is
-- cancel_booking on the block.
create function public.block_slots(p_pitch uuid, p_starts_at timestamptz, p_ends_at timestamptz,
                                   p_reason public.booking_cancel_reason default 'staff_other')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
  v_minutes integer;
  v_error text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_facility is null or not private.is_facility_owner(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or p_reason not in ('venue_closed', 'maintenance', 'weather', 'staff_other') then
    raise exception 'invalid_reason' using errcode = 'invalid_parameter_value';
  end if;
  v_minutes := (extract(epoch from (p_ends_at - p_starts_at)) / 60)::integer;
  v_error := private.slot_error(p_pitch, p_starts_at, v_minutes, 'block');
  if v_error is not null then
    raise exception '%', v_error using errcode = 'check_violation';
  end if;
  perform pg_advisory_xact_lock(hashtext('booking_pitch:' || p_pitch::text));
  begin
    insert into public.bookings (pitch_id, kind, during, created_by, recorded, block_reason)
    values (p_pitch, 'block', tstzrange(p_starts_at, p_ends_at, '[)'), v_uid, false, p_reason)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'check_violation';
  end;
  perform private.write_audit('venue.slots_blocked', 'facility', v_facility::text,
                              jsonb_build_object('booking', v_id, 'reason', p_reason));
  return private.booking_receipt(v_id);
end;
$$;

revoke execute on function public.venue_schedule(uuid, timestamptz, timestamptz),
  public.create_manual_booking(uuid, timestamptz, text, text, uuid),
  public.block_slots(uuid, timestamptz, timestamptz, public.booking_cancel_reason)
  from public, anon;
grant execute on function public.venue_schedule(uuid, timestamptz, timestamptz),
  public.create_manual_booking(uuid, timestamptz, text, text, uuid),
  public.block_slots(uuid, timestamptz, timestamptz, public.booking_cancel_reason)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
