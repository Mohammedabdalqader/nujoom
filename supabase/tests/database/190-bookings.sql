-- Booking transactions, part 1 (D-071; contract agentic_system/contracts/booking.md).
begin;
select plan(34);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
-- An Amman wall-clock time `p_days` from today.
create function pg_temp.at(p_days integer, p_hhmm text) returns timestamptz language sql as $$
  select ((private.amman_today() + p_days)::text || ' ' || p_hhmm || ':00+03')::timestamptz $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('shy', tests.create_user('shy@nujoom.test'));
select tests.remember('kid', tests.create_user('kid@nujoom.test'));
select tests.remember('new', tests.create_user('new@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.create_owner_profile('Abu Sami', '1980-05-05', true);
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());
select tests.act_as(tests.id('shy'));
select public.complete_onboarding('Shy', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'GK', pg_temp.consents() - 'recording');
select tests.act_as(tests.id('kid'));
select public.complete_onboarding('Kid', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());

-- A verified 5-a-side field, open 16:00–24:00 every day, 60-minute slots at 20 JOD; a listed field
-- next to it; and a third field with everything but a known size.
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'ملعب 1', 'published', 5),
       ('00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-0000000000f1', 'ملعب 2', 'published', 5),
       ('00000000-0000-4000-8000-00000000001c', '00000000-0000-4000-8000-0000000000f1', 'ملعب 3', 'published', null);
insert into public.pitch_staff (facility_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'), 'owner');
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
select id, 20, 60, true,
       (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d)
from public.pitches where facility_id = '00000000-0000-4000-8000-0000000000f1';
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000001a';

select throws_ok($$ update public.pitches set participation = 'verified', verified_at = now()
                    where id = '00000000-0000-4000-8000-00000000001c' $$,
  'size_unknown', 'a field can''t become verified without a known size');
select ok(not has_table_privilege('authenticated', 'public.bookings', 'select')
          and not has_table_privilege('authenticated', 'public.booking_private', 'select')
          and not has_table_privilege('authenticated', 'public.booking_players', 'select'),
  'clients never read booking tables directly');

-- Availability ---------------------------------------------------------------------------------------
select tests.act_as_anon();
select throws_ok($$ select public.pitch_busy_ranges('00000000-0000-4000-8000-00000000001a', now(), now() + interval '1 day') $$,
  '42501', null, 'signed-out visitors don''t get availability');
select tests.act_as(tests.id('ana'));
select throws_ok($$ select public.pitch_busy_ranges('00000000-0000-4000-8000-00000000001b', now(), now() + interval '1 day') $$,
  'pitch_unavailable', 'a not-verified field has no availability');
select throws_ok($$ select public.pitch_busy_ranges('00000000-0000-4000-8000-00000000001a', now(), now() + interval '20 days') $$,
  'invalid_window', 'the window is capped');

-- Slot rules ------------------------------------------------------------------------------------------
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001b', %L) $$, pg_temp.at(1, '18:00')),
  'pitch_unavailable', 'a not-verified field can''t be booked');
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(-1, '18:00')),
  'slot_in_past', 'nor a slot in the past');
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(14, '18:00')),
  'beyond_horizon', 'nor beyond 14 days');
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:30')),
  'invalid_slot', 'nor off the slot grid');
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '10:00')),
  'invalid_slot', 'nor outside opening hours');

-- Who may book ------------------------------------------------------------------------------------------
select tests.act_as(tests.id('new'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:00')),
  'not_onboarded', 'a player must finish onboarding first');
select tests.act_as(tests.id('kid'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:00')),
  'guardian_required', 'a youth without a confirmed guardian can''t book a recorded match');
select tests.act_as(tests.id('shy'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:00')),
  'recording_consent_required', 'someone who declined recording can''t book a recorded match (C-010)');
select lives_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L, false) $$, pg_temp.at(2, '16:00')),
  'but can book an unrecorded one');
select tests.act_as(tests.id('kid'));
select lives_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L, false) $$, pg_temp.at(2, '17:00')),
  'and so can a youth');

-- Booking -------------------------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select tests.remember('b1', (public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '18:00'),
  true, '  Blue   Lions ', null, '+962791234567') ->> 'id')::uuid);
select is(
  (select jsonb_build_object('total', r -> 'total', 'pay', r ->> 'payment', 'cur', r ->> 'currency', 'team', r ->> 'team_a_name', 'mins', r -> 'slot_minutes')
   from public.booking_details(tests.id('b1')) r),
  '{"total": 20.00, "pay": "cash_at_pitch", "cur": "JOD", "team": "Blue Lions", "mins": 60}'::jsonb,
  'the receipt: one hour at 20 JOD, cash at the pitch');
select is(public.pitch_busy_ranges('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '00:00'), pg_temp.at(2, '00:00')),
  jsonb_build_array(jsonb_build_object('starts_at', pg_temp.at(1, '18:00'), 'ends_at', pg_temp.at(1, '19:00'))),
  'availability shows the taken hour, and nothing about who');
select tests.act_as(tests.id('bob'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:00')),
  'slot_taken', 'the same hour can''t be booked twice');
select tests.act_as(tests.id('ana'));
select tests.remember('req', '00000000-0000-4000-8000-00000000abcd');
select tests.remember('b2', (public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '19:00'), true,
  null, null, null, tests.id('req')) ->> 'id')::uuid);
select is((public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '19:00'), true,
  null, null, null, tests.id('req')) ->> 'id')::uuid, tests.id('b2'),
  'a retried request returns the booking it already made');
select public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(13, '23:00'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '21:00')),
  'too_many_bookings', 'at most three upcoming bookings (the last day and the last hour of the day count)');

-- The receipt keeps the booked price ------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}', '{"price_per_hour":30,"slot_minutes":60}');
select tests.act_as(tests.id('ana'));
select is((public.booking_details(tests.id('b1')) ->> 'total')::numeric, 20.00::numeric,
  'a later price change never rewrites a receipt');

-- Who sees what ---------------------------------------------------------------------------------------------
select is(
  (select jsonb_build_object('players', jsonb_array_length(r -> 'players'), 'phone', r ->> 'contact_phone')
   from public.booking_details(tests.id('b1')) r),
  '{"players": 1, "phone": "+962791234567"}'::jsonb, 'the organizer sees the players and their contact phone');
select tests.act_as(tests.id('bob'));
select throws_ok(format($$ select public.booking_details(%L) $$, tests.id('b1')), 'not_found',
  'someone else''s booking is invisible');
select throws_ok(format($$ select public.cancel_booking(%L) $$, tests.id('b1')), 'not_found',
  'and can''t be cancelled by them');
select tests.act_as(tests.id('owner'));
select is(public.booking_details(tests.id('b1')) ->> 'contact_phone', '+962791234567',
  'the venue''s staff see the booking and its contact phone');

-- Cancelling -------------------------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select is(public.cancel_booking(tests.id('b1')) ->> 'cancel_reason', 'organizer', 'the organizer cancels');
select is(public.cancel_booking(tests.id('b1')) ->> 'status', 'cancelled', 'cancelling twice changes nothing');
select tests.act_as(tests.id('bob'));
select tests.remember('b3', (public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '18:00')) ->> 'id')::uuid);
select isnt(tests.id('b3'), null, 'the freed hour can be booked again');
select tests.act_as(tests.id('owner'));
select is(public.cancel_booking(tests.id('b3'), 'weather') ->> 'cancel_reason', 'weather',
  'the venue cancels with a reason');
select tests.act_as(tests.id('ana'));
select is(jsonb_array_length(public.my_bookings()), 3, 'my bookings lists what I organize, cancelled ones included');

-- Account deletion and data export --------------------------------------------------------------------------
select tests.act_as_postgres();
select is(jsonb_array_length(public.export_user_data(tests.id('ana')) -> 'bookings'), 3,
  'the data export includes bookings');
delete from auth.users where id = tests.id('ana');
select is(
  (select jsonb_agg(distinct cancel_reason) from public.bookings
   where id = tests.id('b2') or lower(during) = pg_temp.at(13, '23:00')),
  '["account_deleted"]'::jsonb, 'deleting an account cancels its future bookings');
select is((select count(*)::integer from public.bookings where organizer_id = tests.id('ana')), 0,
  'and removes the link to the person');
select is((select count(*)::integer from public.events where name = 'booking_created'), 6,
  'each booking is counted for the KPIs');

select * from finish();
rollback;
