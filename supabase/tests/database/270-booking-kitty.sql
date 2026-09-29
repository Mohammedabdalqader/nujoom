-- The pitch kitty (D-095).
begin;
select plan(16);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.at(p_days integer, p_hhmm text) returns timestamptz language sql as $$
  select ((private.amman_today() + p_days)::text || ' ' || p_hhmm || ':00+03')::timestamptz $$;
create function pg_temp.keep(p_name text, p_value text) returns text language sql as $$
  select set_config('tests.' || p_name, p_value, true) $$;
create function pg_temp.kept(p_name text) returns text language sql as $$
  select current_setting('tests.' || p_name) $$;
create function pg_temp.row(p_state jsonb, p_name text) returns jsonb language sql as $$
  select p from jsonb_array_elements(p_state -> 'players') p where p ->> 'name' = p_name $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('dan', tests.create_user('dan@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'GK', pg_temp.consents());
select tests.act_as(tests.id('dan'));
select public.complete_onboarding('Dan', pg_temp.years_ago(28), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000006f1', 'ملاعب القطية', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000061a', '00000000-0000-4000-8000-0000000006f1', 'ملعب 1', 'published', 5);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000061a', 30, 60, true,
        (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000061a';

select tests.act_as(tests.id('ana'));
select pg_temp.keep('b', public.create_booking('00000000-0000-4000-8000-00000000061a', pg_temp.at(1, '18:00'), false) ->> 'id');
select pg_temp.keep('t', public.booking_invite(pg_temp.kept('b')::uuid) ->> 'token');
select tests.act_as(tests.id('bob'));
select public.join_booking(pg_temp.kept('t'));

select ok(not has_table_privilege('authenticated', 'public.booking_kitty', 'select')
          and not has_table_privilege('authenticated', 'public.booking_kitty_guests', 'select')
          and not has_table_privilege('authenticated', 'public.booking_kitty_payments', 'select'),
  'clients never read the kitty directly');
select tests.act_as(tests.id('dan'));
select throws_ok($$ select public.booking_kitty(pg_temp.kept('b')::uuid) $$, 'not_found',
  'someone outside the match can''t see its kitty');

select tests.act_as(tests.id('bob'));
select ok((select (k ->> 'pitch_cost_fils')::int = 30000 and (k ->> 'extras_fils')::int = 0
                  and not (k ->> 'is_organizer')::boolean
                  and jsonb_array_length(k -> 'players') = 2
                  and pg_temp.row(k, 'Ana') ->> 'ref' is null
           from public.booking_kitty(pg_temp.kept('b')::uuid) k),
  'a player sees the booked price (30 JOD), both players and no handles');
select throws_ok($$ select public.set_kitty_costs(pg_temp.kept('b')::uuid, 1, 1) $$, 'not_organizer',
  'only the organizer changes the costs');

select tests.act_as(tests.id('ana'));
select is((public.set_kitty_costs(pg_temp.kept('b')::uuid, 35000, 5000) ->> 'extras_fils')::int, 5000,
  'the organizer sets the pitch cost and extras');
select throws_ok($$ select public.set_kitty_costs(pg_temp.kept('b')::uuid, -1, 0) $$, 'invalid_amount',
  'amounts can''t be negative');
select throws_ok($$ select public.set_kitty_costs(pg_temp.kept('b')::uuid, 1000001, 0) $$, 'invalid_amount',
  'nor above 1000 JOD');
select is(pg_temp.row(public.add_kitty_guest(pg_temp.kept('b')::uuid, '  زيد  '), 'زيد') ->> 'kind', 'guest',
  'the organizer adds a walk-in guest by first name');
select throws_ok(format($$ select public.add_kitty_guest(%L, %L) $$, pg_temp.kept('b'), repeat('x', 31)),
  'invalid_guest_name', 'guest names are short');
select pg_temp.keep('bob_ref', pg_temp.row(public.booking_kitty(pg_temp.kept('b')::uuid), 'Bob') ->> 'ref');
select pg_temp.keep('zaid_ref', pg_temp.row(public.booking_kitty(pg_temp.kept('b')::uuid), 'زيد') ->> 'ref');
select is(pg_temp.row(public.mark_kitty_payment(pg_temp.kept('b')::uuid, pg_temp.kept('bob_ref')::uuid, 'cliq'), 'Bob') ->> 'paid',
  'cliq', 'the organizer marks a player paid by CliQ');
select is(pg_temp.row(public.mark_kitty_payment(pg_temp.kept('b')::uuid, pg_temp.kept('zaid_ref')::uuid, 'cash'), 'زيد') ->> 'paid',
  'cash', 'and a guest paid in cash');
select is(pg_temp.row(public.mark_kitty_payment(pg_temp.kept('b')::uuid, pg_temp.kept('bob_ref')::uuid, null), 'Bob') ->> 'paid',
  null, 'a mark can be cleared');
select throws_ok(format($$ select public.mark_kitty_payment(%L, %L, 'stars') $$, pg_temp.kept('b'), pg_temp.kept('bob_ref')),
  'invalid_payment_method', 'only cash or CliQ: stars never pay (D-006.1)');
select throws_ok(format($$ select public.mark_kitty_payment(%L, %L, 'cash') $$, pg_temp.kept('b'), gen_random_uuid()),
  'not_a_player', 'an unknown person can''t be marked');

select public.mark_kitty_payment(pg_temp.kept('b')::uuid, pg_temp.kept('bob_ref')::uuid, 'cash');
select tests.act_as_postgres();
select is(public.export_user_data(tests.id('bob')) -> 'kitty_payments' -> 0 ->> 'method', 'cash',
  'a person''s payment marks are in their data export');
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'organizer'
where id = pg_temp.kept('b')::uuid;
select tests.act_as(tests.id('bob'));
select throws_ok($$ select public.booking_kitty(pg_temp.kept('b')::uuid) $$, 'booking_cancelled',
  'a cancelled match has no kitty');

select * from finish();
rollback;
