-- A field's slots for one day, from the server (D-074).
begin;
select plan(8);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.at(p_days integer, p_hhmm text) returns timestamptz language sql as $$
  select ((private.amman_today() + p_days)::text || ' ' || p_hhmm || ':00+03')::timestamptz $$;
create function pg_temp.states(p_date date) returns jsonb language sql as $$
  select jsonb_agg(s ->> 'state' order by s ->> 'starts_at')
  from jsonb_array_elements(public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', p_date) -> 'slots') s $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'published', 5),
       ('00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-0000000000f1', 'published', 5);
-- 16:00–20:00 in 90-minute slots (two fit, 19:00–20:00 is left over), plus 22:00–24:00 on a
-- split day.
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000001a', 30, 90, true,
        (select jsonb_object_agg(d, '[["16:00","20:00"],["22:00","24:00"]]'::jsonb)
         from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000001a';

select tests.act_as_anon();
select throws_ok(format($$ select public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', %L) $$, private.amman_today() + 1),
  '42501', null, 'signed-out visitors get nothing');
select tests.act_as(tests.id('ana'));
select throws_ok(format($$ select public.pitch_day_slots('00000000-0000-4000-8000-00000000001b', %L) $$, private.amman_today() + 1),
  'pitch_unavailable', 'a not-verified field has no slots');
select throws_ok(format($$ select public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', %L) $$, private.amman_today() + 14),
  'beyond_horizon', 'nor days beyond the 14-day horizon');
select throws_ok(format($$ select public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', %L) $$, private.amman_today() - 1),
  'slot_in_past', 'nor days gone by');
select is(
  (select jsonb_agg(s ->> 'starts_at' order by s ->> 'starts_at')
   from jsonb_array_elements(public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', private.amman_today() + 1) -> 'slots') s),
  jsonb_build_array(pg_temp.at(1, '16:00'), pg_temp.at(1, '17:30'), pg_temp.at(1, '22:00')),
  'each opening range starts its own 90-minute grid; leftovers are not slots');
select public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '17:30'));
select is(pg_temp.states(private.amman_today() + 1), '["free", "busy", "free"]'::jsonb,
  'a booked slot shows as busy, and nothing more');
select is((public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', private.amman_today() + 1) ->> 'price_per_hour')::numeric,
  30::numeric, 'the day comes with the current price');
select ok(
  (select bool_and((s ->> 'state' = 'past') = ((s ->> 'starts_at')::timestamptz < now()))
   from jsonb_array_elements(public.pitch_day_slots('00000000-0000-4000-8000-00000000001a', private.amman_today()) -> 'slots') s),
  'today, slots that have started are past');

select * from finish();
rollback;
