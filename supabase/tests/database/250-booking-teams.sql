-- Teams and bibs (D-092).
begin;
select plan(14);

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
-- A player's remove handle, as the organizer sees it.
create function pg_temp.ref(p_name text) returns text language sql as $$
  select p ->> 'player_ref' from jsonb_array_elements(public.booking_details(pg_temp.kept('b')::uuid) -> 'players') p
  where p ->> 'name' = p_name $$;
create function pg_temp.player(p_details jsonb, p_name text) returns jsonb language sql as $$
  select p from jsonb_array_elements(p_details -> 'players') p where p ->> 'name' = p_name $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('cat', tests.create_user('cat@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'GK', pg_temp.consents());
select tests.act_as(tests.id('cat'));
select public.complete_onboarding('Cat', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000004f1', 'ملاعب الفرق', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000041a', '00000000-0000-4000-8000-0000000004f1', 'ملعب 1', 'published', 5);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000041a', 20, 60, true,
        (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000041a';

-- Ana organizes; Bob and Cat join.
select tests.act_as(tests.id('ana'));
select pg_temp.keep('b', public.create_booking('00000000-0000-4000-8000-00000000041a', pg_temp.at(1, '18:00'), false) ->> 'id');
select pg_temp.keep('t', public.booking_invite(pg_temp.kept('b')::uuid) ->> 'token');
select tests.act_as(tests.id('bob'));
select public.join_booking(pg_temp.kept('t'));
select tests.act_as(tests.id('cat'));
select public.join_booking(pg_temp.kept('t'));

select tests.act_as(tests.id('bob'));
select is(pg_temp.player(public.booking_details(pg_temp.kept('b')::uuid), 'Cat') ->> 'position', 'FWD',
  'players see the position each one plays, for picking teams');
select throws_ok($$ select public.set_booking_teams(pg_temp.kept('b')::uuid, '[]') $$,
  'not_organizer', 'only the organizer saves the teams');

select tests.act_as(tests.id('ana'));
select pg_temp.keep('ana', pg_temp.ref('Ana'));
select pg_temp.keep('bob', pg_temp.ref('Bob'));
select pg_temp.keep('cat', pg_temp.ref('Cat'));
select ok(
  (select pg_temp.player(d, 'Ana') ->> 'team' = 'a' and (pg_temp.player(d, 'Ana') ->> 'bib')::int = 1
      and pg_temp.player(d, 'Bob') ->> 'team' = 'b' and (pg_temp.player(d, 'Bob') ->> 'bib')::int = 2
      and pg_temp.player(d, 'Cat') ->> 'team' is null
   from public.set_booking_teams(pg_temp.kept('b')::uuid, jsonb_build_array(
          jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'a', 'bib', 1),
          jsonb_build_object('player_ref', pg_temp.kept('bob'), 'team', 'b', 'bib', 2))) d),
  'the organizer saves a line-up; players left out aren''t placed');
select ok(
  (select pg_temp.player(d, 'Ana') ->> 'team' = 'b' and (pg_temp.player(d, 'Ana') ->> 'bib')::int = 2
      and pg_temp.player(d, 'Bob') ->> 'team' is null and pg_temp.player(d, 'Bob') ->> 'bib' is null
      and pg_temp.player(d, 'Cat') ->> 'team' = 'a' and (pg_temp.player(d, 'Cat') ->> 'bib')::int = 1
   from public.set_booking_teams(pg_temp.kept('b')::uuid, jsonb_build_array(
          jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'b', 'bib', 2),
          jsonb_build_object('player_ref', pg_temp.kept('cat'), 'team', 'a', 'bib', 1))) d),
  'saving again replaces the line-up, and bibs can move between players');

-- Refused as a whole.
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'a', 'bib', 3),
  jsonb_build_object('player_ref', pg_temp.kept('bob'), 'team', 'b', 'bib', 3))),
  'invalid_assignment', 'a bib used twice is refused');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'a'),
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'b'))),
  'invalid_assignment', 'a player named twice is refused');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'team', 'c'))),
  'invalid_assignment', 'a team other than A or B is refused');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'bib', 13))),
  'invalid_assignment', 'bibs run 1 to 12');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('ana'), 'bib', 'x'))),
  'invalid_assignment', 'a bib that isn''t a number is refused, not an error');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', 'not-a-uuid', 'team', 'a'))),
  'invalid_assignment', 'an unknown player is refused');
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), '{"team": "a"}'),
  'invalid_assignment', 'the line-up must be a list');
select is((select pg_temp.player(public.booking_details(pg_temp.kept('b')::uuid), 'Cat') ->> 'team'), 'a',
  'a refused save changes nothing');

-- A removed player can't be placed.
select public.remove_player(pg_temp.kept('b')::uuid, pg_temp.kept('bob')::uuid);
select throws_ok(format($$ select public.set_booking_teams(%L, %L) $$, pg_temp.kept('b'), jsonb_build_array(
  jsonb_build_object('player_ref', pg_temp.kept('bob'), 'team', 'a'))),
  'invalid_assignment', 'a removed player can''t be placed');

select tests.act_as_postgres();
select ok((select count(*) from public.events where name = 'tool_used' and properties ->> 'tool' = 'teams') >= 2,
  'saving teams is counted as a match tool use');

select * from finish();
rollback;
