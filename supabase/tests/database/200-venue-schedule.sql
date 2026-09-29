-- Booking part 2: the venue's calendar, walk-in bookings and blocks (D-072).
begin;
select plan(20);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.at(p_days integer, p_hhmm text) returns timestamptz language sql as $$
  select ((private.amman_today() + p_days)::text || ' ' || p_hhmm || ':00+03')::timestamptz $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('helper', tests.create_user('helper@nujoom.test'));
select tests.remember('other', tests.create_user('other-owner@nujoom.test'));
select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.create_owner_profile('Abu Sami', '1980-05-05', true);
select tests.act_as(tests.id('helper'));
select public.create_owner_profile('Hamza', '1995-02-02', true);
select tests.act_as(tests.id('other'));
select public.create_owner_profile('Other', '1975-01-01', true);
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified'),
       ('00000000-0000-4000-8000-0000000000f2', 'ملاعب القمر', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'ملعب 1', 'published', 5);
insert into public.pitch_staff (facility_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'), 'owner'),
       ('00000000-0000-4000-8000-0000000000f1', tests.id('helper'), 'staff'),
       ('00000000-0000-4000-8000-0000000000f2', tests.id('other'), 'owner');
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000001a', 20, 60, true,
        (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000001a';

-- Walk-in and phone bookings ---------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select throws_ok(format($$ select public.create_manual_booking('00000000-0000-4000-8000-00000000001a', %L, 'Abu Ali') $$, pg_temp.at(1, '18:00')),
  'forbidden', 'players can''t make walk-in bookings');
select tests.act_as(tests.id('other'));
select throws_ok(format($$ select public.create_manual_booking('00000000-0000-4000-8000-00000000001a', %L, 'Abu Ali') $$, pg_temp.at(1, '18:00')),
  'forbidden', 'nor the owner of another venue');
select tests.act_as(tests.id('helper'));
select throws_ok(format($$ select public.create_manual_booking('00000000-0000-4000-8000-00000000001a', %L, '  ') $$, pg_temp.at(1, '18:00')),
  'invalid_walk_in_name', 'a walk-in booking needs a name');
select throws_ok(format($$ select public.create_manual_booking('00000000-0000-4000-8000-00000000001a', %L, 'Abu Ali') $$, pg_temp.at(1, '18:30')),
  'invalid_slot', 'and follows the same slot rules');
select tests.remember('walkin', (public.create_manual_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '18:00'),
  'Abu Ali', '+962790000001') ->> 'id')::uuid);
select is(public.booking_details(tests.id('walkin')) ->> 'walk_in_name', 'Abu Ali',
  'staff book a walk-in customer, with the price snapshot');
select tests.act_as(tests.id('ana'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(1, '18:00')),
  'slot_taken', 'a player can''t take the walk-in''s hour');
select public.create_booking('00000000-0000-4000-8000-00000000001a', pg_temp.at(1, '19:00'), true, null, null, '+962790000002');
select tests.act_as(tests.id('helper'));
select throws_ok(format($$ select public.create_manual_booking('00000000-0000-4000-8000-00000000001a', %L, 'Abu Ali') $$, pg_temp.at(1, '19:00')),
  'slot_taken', 'nor staff the player''s');

-- Blocks ---------------------------------------------------------------------------------------------
select throws_ok(format($$ select public.block_slots('00000000-0000-4000-8000-00000000001a', %L, %L, 'maintenance') $$,
                        pg_temp.at(2, '16:00'), pg_temp.at(2, '20:00')),
  'forbidden', 'staff can''t block time; owners do');
select tests.act_as(tests.id('owner'));
select throws_ok(format($$ select public.block_slots('00000000-0000-4000-8000-00000000001a', %L, %L, 'maintenance') $$,
                        pg_temp.at(1, '18:00'), pg_temp.at(1, '20:00')),
  'slot_taken', 'a block can''t cover existing bookings');
select throws_ok(format($$ select public.block_slots('00000000-0000-4000-8000-00000000001a', %L, %L, 'maintenance') $$,
                        pg_temp.at(2, '16:00'), pg_temp.at(2, '16:30')),
  'invalid_slot', 'blocks are whole slots');
select throws_ok(format($$ select public.block_slots('00000000-0000-4000-8000-00000000001a', %L, %L, 'admin') $$,
                        pg_temp.at(2, '16:00'), pg_temp.at(2, '20:00')),
  'invalid_reason', 'with a venue reason');
select tests.remember('block', (public.block_slots('00000000-0000-4000-8000-00000000001a', pg_temp.at(2, '16:00'),
  pg_temp.at(2, '20:00'), 'maintenance') ->> 'id')::uuid);
select lives_ok(format($$ select public.block_slots('00000000-0000-4000-8000-00000000001a', %L, %L, 'venue_closed') $$,
                       pg_temp.at(60, '16:00'), pg_temp.at(60, '24:00')),
  'owners can block further ahead than players can book');
select tests.act_as(tests.id('ana'));
select throws_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(2, '17:00')),
  'slot_taken', 'a blocked hour can''t be booked');
select is(jsonb_array_length(public.pitch_busy_ranges('00000000-0000-4000-8000-00000000001a', pg_temp.at(2, '00:00'), pg_temp.at(3, '00:00'))),
  1, 'availability shows the block as taken time, without saying why');

-- The calendar ------------------------------------------------------------------------------------------
select throws_ok(format($$ select public.venue_schedule('00000000-0000-4000-8000-0000000000f1', %L, %L) $$,
                        pg_temp.at(0, '00:00'), pg_temp.at(7, '00:00')),
  'forbidden', 'players can''t read a venue''s calendar');
select tests.act_as(tests.id('helper'));
select is(
  (select jsonb_agg(jsonb_build_object('kind', e ->> 'kind', 'who', coalesce(e ->> 'organizer', e ->> 'walk_in_name', e ->> 'block_reason'))
                    order by e ->> 'starts_at')
   from jsonb_array_elements(public.venue_schedule('00000000-0000-4000-8000-0000000000f1', pg_temp.at(0, '00:00'), pg_temp.at(7, '00:00'))) e),
  '[{"kind": "manual", "who": "Abu Ali"}, {"kind": "app", "who": "Ana"}, {"kind": "block", "who": "maintenance"}]'::jsonb,
  'staff see the week: the walk-in, the player''s booking and the block');
select throws_ok(format($$ select public.venue_schedule('00000000-0000-4000-8000-0000000000f1', %L, %L) $$,
                        pg_temp.at(0, '00:00'), pg_temp.at(40, '00:00')),
  'invalid_window', 'at most a month at a time');

-- Unblocking and cancelling from the venue's side ------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select is(public.cancel_booking(tests.id('block'), 'staff_other') ->> 'status', 'cancelled', 'the owner lifts the block');
select tests.act_as(tests.id('ana'));
select lives_ok(format($$ select public.create_booking('00000000-0000-4000-8000-00000000001a', %L) $$, pg_temp.at(2, '17:00')),
  'and the hour can be booked again');
select tests.act_as_postgres();
select is(
  (select jsonb_agg(action order by id) from public.audit_log where action in ('venue.manual_booking', 'venue.slots_blocked')),
  '["venue.manual_booking", "venue.slots_blocked", "venue.slots_blocked"]'::jsonb,
  'walk-in bookings and blocks are audited');

select * from finish();
rollback;
