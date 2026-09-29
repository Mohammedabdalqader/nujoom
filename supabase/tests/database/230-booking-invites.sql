-- Match invites and joining (D-083; contract agentic_system/contracts/invites.md).
begin;
select plan(42);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.at(p_days integer, p_hhmm text) returns timestamptz language sql as $$
  select ((private.amman_today() + p_days)::text || ' ' || p_hhmm || ':00+03')::timestamptz $$;
-- Tokens and booking ids kept across statements, whatever the current role.
create function pg_temp.keep(p_name text, p_value text) returns text language sql as $$
  select set_config('tests.' || p_name, p_value, true) $$;
create function pg_temp.kept(p_name text) returns text language sql as $$
  select current_setting('tests.' || p_name) $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('cat', tests.create_user('cat@nujoom.test'));
select tests.remember('shy', tests.create_user('shy@nujoom.test'));
select tests.remember('kid', tests.create_user('kid@nujoom.test'));
select tests.remember('kid2', tests.create_user('kid2@nujoom.test'));
select tests.remember('teen', tests.create_user('teen@nujoom.test'));
select tests.remember('new', tests.create_user('new@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());
select tests.act_as(tests.id('cat'));
select public.complete_onboarding('Cat', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());
select tests.act_as(tests.id('shy'));
select public.complete_onboarding('Shy', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'GK', pg_temp.consents() - 'recording');
select tests.act_as(tests.id('kid'));
select public.complete_onboarding('Kid', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());
select tests.act_as(tests.id('kid2'));
select public.complete_onboarding('Kid Two', pg_temp.years_ago(14), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('teen'));
select public.complete_onboarding('Teen', pg_temp.years_ago(16), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

-- A verified 5-a-side field (room for 12) and a verified 3-a-side field (room for 8), open
-- 16:00–24:00, 60-minute slots at 20 JOD.
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000002f1', 'ملاعب الدعوة', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000021a', '00000000-0000-4000-8000-0000000002f1', 'ملعب 1', 'published', 5),
       ('00000000-0000-4000-8000-00000000021b', '00000000-0000-4000-8000-0000000002f1', 'ملعب 2', 'published', 3);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
select id, 20, 60, true,
       (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d)
from public.pitches where facility_id = '00000000-0000-4000-8000-0000000002f1';
update public.pitches set participation = 'verified', verified_at = now()
where facility_id = '00000000-0000-4000-8000-0000000002f1';

select ok(not has_table_privilege('authenticated', 'public.booking_invites', 'select')
          and not has_table_privilege('anon', 'public.booking_invites', 'select'),
  'clients never read invite links directly');

-- The organizer's link ----------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select pg_temp.keep('b1', public.create_booking('00000000-0000-4000-8000-00000000021a', pg_temp.at(1, '18:00')) ->> 'id');
select tests.act_as(tests.id('bob'));
select throws_ok($$ select public.booking_invite(pg_temp.kept('b1')::uuid) $$,
  'not_found', 'someone outside the booking can''t get its link');
select tests.act_as(tests.id('ana'));
select pg_temp.keep('t1', public.booking_invite(pg_temp.kept('b1')::uuid) ->> 'token');
select ok(pg_temp.kept('t1') ~ '^[A-Za-z0-9_-]{43}$', 'the organizer gets a long random link token');
select is(public.booking_invite(pg_temp.kept('b1')::uuid) ->> 'token', pg_temp.kept('t1'),
  'asking again gives the same link, so it can be re-shared');

-- Previews --------------------------------------------------------------------------------------------
select tests.act_as_anon();
select ok((public.booking_preview_public(pg_temp.kept('t1')) ->> 'open_spots')::int = 11
          and public.booking_preview_public(pg_temp.kept('t1')) -> 'venue' ->> 'ar' = 'ملاعب الدعوة'
          and not (public.booking_preview_public(pg_temp.kept('t1')) ?| array['players', 'total', 'invited_by', 'price_per_hour', 'id']),
  'the public page shows place, time and room left, without names, price or players');
select throws_ok($$ select public.booking_preview(pg_temp.kept('t1')) $$, '42501', null,
  'the full preview needs an account');
select throws_ok($$ select public.booking_preview_public('not-a-token') $$, 'invite_invalid',
  'an unknown link is refused');
select tests.act_as(tests.id('bob'));
select ok((public.booking_preview(pg_temp.kept('t1')) ->> 'can_join')::boolean
          and public.booking_preview(pg_temp.kept('t1')) ->> 'invited_by' = 'Ana'
          and (public.booking_preview(pg_temp.kept('t1')) ->> 'total')::numeric = 20
          and not (public.booking_preview(pg_temp.kept('t1')) ? 'players'),
  'a signed-in preview says who invited them and the total, but shows no roster');

-- Who may join -----------------------------------------------------------------------------------------
select tests.act_as(tests.id('new'));
select throws_ok($$ select public.join_booking(pg_temp.kept('t1')) $$, 'not_onboarded',
  'a player must finish onboarding first');
select tests.act_as(tests.id('shy'));
select is(public.booking_preview(pg_temp.kept('t1')) ->> 'reason', 'recording_consent_required',
  'the preview says why before they try');
select throws_ok($$ select public.join_booking(pg_temp.kept('t1')) $$, 'recording_consent_required',
  'someone who declined recording can''t join a recorded match (C-010)');
select tests.act_as(tests.id('kid'));
select throws_ok($$ select public.join_booking(pg_temp.kept('t1')) $$, 'guardian_required',
  'a youth without a confirmed guardian can''t join a recorded match');
select tests.act_as(tests.id('bob'));
select is(public.join_booking(pg_temp.kept('t1')) ->> 'id', pg_temp.kept('b1'), 'a player joins with the link');
select is(public.join_booking(pg_temp.kept('t1')) ->> 'id', pg_temp.kept('b1'), 'joining twice is a success');
select ok(jsonb_array_length(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') = 2
          and exists (select 1 from jsonb_array_elements(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') p
                      where p ->> 'name' = 'Bob' and (p ->> 'is_me')::boolean)
          and not exists (select 1 from jsonb_array_elements(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') p
                          where p ->> 'player_ref' is not null),
  'once in, they see the roster with themselves marked, but no remove handles');
select ok(exists (select 1 from jsonb_array_elements(public.my_bookings()) b where b ->> 'id' = pg_temp.kept('b1')),
  'the match is in their bookings');
select tests.act_as_postgres();
select is((select count(*)::int from public.events where name = 'player_joined' and user_id = tests.id('bob')), 1,
  'the join is counted once');

-- Leave and remove --------------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select ok((public.booking_details(pg_temp.kept('b1')::uuid) ->> 'capacity')::int = 12
          and (public.booking_details(pg_temp.kept('b1')::uuid) ->> 'open_spots')::int = 10
          and not exists (select 1 from jsonb_array_elements(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') p
                          where p ->> 'player_ref' is null),
  'the organizer sees room left and a remove handle for everyone');
select throws_ok($$ select public.leave_booking(pg_temp.kept('b1')::uuid) $$, 'organizer_cannot_leave',
  'the organizer cancels instead of leaving');
select throws_ok(format($$ select public.remove_player(%L, %L) $$, pg_temp.kept('b1'),
  (select p ->> 'player_ref' from jsonb_array_elements(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') p
   where (p ->> 'is_organizer')::boolean)),
  'organizer_cannot_leave', 'nor remove themselves');
select tests.act_as(tests.id('bob'));
select lives_ok($$ select public.leave_booking(pg_temp.kept('b1')::uuid) $$, 'a player can leave');
select throws_ok($$ select public.booking_details(pg_temp.kept('b1')::uuid) $$, 'not_found',
  'after leaving they no longer see the match');
select is(public.join_booking(pg_temp.kept('t1')) ->> 'id', pg_temp.kept('b1'), 'and may come back through the link');
select tests.act_as(tests.id('ana'));
select pg_temp.keep('bob_ref', (select p ->> 'player_ref' from jsonb_array_elements(public.booking_details(pg_temp.kept('b1')::uuid) -> 'players') p
                                where p ->> 'name' = 'Bob'));
select is(jsonb_array_length(public.remove_player(pg_temp.kept('b1')::uuid, pg_temp.kept('bob_ref')::uuid) -> 'players'), 1,
  'the organizer removes a player');
select tests.act_as(tests.id('bob'));
select is(public.booking_preview(pg_temp.kept('t1')) ->> 'reason', 'removed', 'the preview tells a removed player');
select throws_ok($$ select public.join_booking(pg_temp.kept('t1')) $$, 'removed_from_booking',
  'a removed player can''t rejoin through the same link');
select tests.act_as(tests.id('cat'));
select throws_ok(format($$ select public.remove_player(%L, %L) $$, pg_temp.kept('b1'), gen_random_uuid()),
  'not_found', 'a stranger can''t remove anyone');
select throws_ok($$ select public.leave_booking(pg_temp.kept('b1')::uuid) $$, 'not_found',
  'nor leave a match they''re not in');

-- Resetting the link --------------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select pg_temp.keep('t2', public.reset_booking_invite(pg_temp.kept('b1')::uuid) ->> 'token');
select isnt(pg_temp.kept('t2'), pg_temp.kept('t1'), 'a reset gives a new link');
select tests.act_as(tests.id('cat'));
select throws_ok($$ select public.booking_preview(pg_temp.kept('t1')) $$, 'invite_invalid',
  'the old link stops working at once');
select tests.act_as(tests.id('bob'));
select is(public.join_booking(pg_temp.kept('t2')) ->> 'id', pg_temp.kept('b1'),
  'the new link lets a removed player back in (the organizer''s way to undo a removal)');

-- Room left ------------------------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select pg_temp.keep('b2', public.create_booking('00000000-0000-4000-8000-00000000021b', pg_temp.at(1, '19:00'), false) ->> 'id');
select pg_temp.keep('t3', public.booking_invite(pg_temp.kept('b2')::uuid) ->> 'token');
-- Six more players are already in (7 of 8).
select tests.act_as_postgres();
do $$
declare
  v uuid;
begin
  for i in 1..6 loop
    v := tests.create_user('fill' || i || '@nujoom.test');
    perform set_config('request.jwt.claim.sub', v::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
    perform public.complete_onboarding('Filler ' || i, pg_temp.years_ago(20), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
    insert into public.booking_players (booking_id, user_id) values (pg_temp.kept('b2')::uuid, v);
  end loop;
end $$;
select tests.act_as(tests.id('cat'));
select is(public.join_booking(pg_temp.kept('t3')) ->> 'id', pg_temp.kept('b2'), 'the last spot can be taken');
select tests.act_as(tests.id('bob'));
select ok(public.booking_preview(pg_temp.kept('t3')) ->> 'reason' = 'full'
          and (public.booking_preview(pg_temp.kept('t3')) ->> 'open_spots')::int = 0,
  'then the preview says it''s full');
select throws_ok($$ select public.join_booking(pg_temp.kept('t3')) $$, 'booking_full',
  'and nobody else gets in (size × 2 + 2)');

-- A youth's match ------------------------------------------------------------------------------------------
select tests.act_as(tests.id('teen'));
select pg_temp.keep('b3', public.create_booking('00000000-0000-4000-8000-00000000021a', pg_temp.at(2, '18:00'), false) ->> 'id');
select pg_temp.keep('t4', public.booking_invite(pg_temp.kept('b3')::uuid) ->> 'token');
select tests.act_as_anon();
select is(public.booking_preview_public(pg_temp.kept('t4')), '{"details_hidden": true}'::jsonb,
  'the public page shows nothing about a youth''s match');
select tests.act_as(tests.id('bob'));
select ok(public.booking_preview(pg_temp.kept('t4')) ->> 'reason' = 'youth_only'
          and public.booking_preview(pg_temp.kept('t4')) ->> 'invited_by' is null,
  'an adult sees no youth organizer''s name and that the match is for youth');
select throws_ok($$ select public.join_booking(pg_temp.kept('t4')) $$, 'youth_only_match',
  'an adult can''t join a youth''s match');
select tests.act_as(tests.id('kid'));
select is(public.join_booking(pg_temp.kept('t4')) ->> 'id', pg_temp.kept('b3'),
  'another youth can join an unrecorded match without a guardian yet');

-- Started and cancelled ------------------------------------------------------------------------------------
select tests.act_as_postgres();
update public.bookings set during = tstzrange(now() - interval '10 minutes', now() + interval '50 minutes', '[)')
where id = pg_temp.kept('b3')::uuid;
select tests.act_as(tests.id('kid2'));
select throws_ok($$ select public.join_booking(pg_temp.kept('t4')) $$, 'booking_started',
  'nobody joins once the match has started');
select tests.act_as(tests.id('ana'));
select public.cancel_booking(pg_temp.kept('b1')::uuid);
select tests.act_as(tests.id('cat'));
select is(public.booking_preview(pg_temp.kept('t2')) ->> 'reason', 'cancelled', 'a cancelled match says so');
select throws_ok($$ select public.join_booking(pg_temp.kept('t2')) $$, 'booking_cancelled',
  'and can''t be joined');
select tests.act_as(tests.id('ana'));
select throws_ok($$ select public.booking_invite(pg_temp.kept('b1')::uuid) $$, 'booking_cancelled',
  'nor shared any more');

select * from finish();
rollback;
