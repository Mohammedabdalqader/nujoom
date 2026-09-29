-- The match gear checklist (D-093).
begin;
select plan(17);

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
create function pg_temp.item(p_list jsonb, p_kind text) returns jsonb language sql as $$
  select i from jsonb_array_elements(p_list -> 'items') i where i ->> 'kind' = p_kind limit 1 $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('cat', tests.create_user('cat@nujoom.test'));
select tests.remember('dan', tests.create_user('dan@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'GK', pg_temp.consents());
select tests.act_as(tests.id('cat'));
select public.complete_onboarding('Cat', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());
select tests.act_as(tests.id('dan'));
select public.complete_onboarding('Dan', pg_temp.years_ago(28), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000005f1', 'ملاعب العتاد', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000051a', '00000000-0000-4000-8000-0000000005f1', 'ملعب 1', 'published', 5);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000051a', 20, 60, true,
        (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000051a';

-- Ana organizes; Bob and Cat join; Dan doesn't.
select tests.act_as(tests.id('ana'));
select pg_temp.keep('b', public.create_booking('00000000-0000-4000-8000-00000000051a', pg_temp.at(1, '18:00'), false) ->> 'id');
select pg_temp.keep('t', public.booking_invite(pg_temp.kept('b')::uuid) ->> 'token');
select tests.act_as(tests.id('bob'));
select public.join_booking(pg_temp.kept('t'));
select tests.act_as(tests.id('cat'));
select public.join_booking(pg_temp.kept('t'));

select ok(not has_table_privilege('authenticated', 'public.booking_gear_items', 'select'),
  'clients never read the checklist directly');
select tests.act_as(tests.id('dan'));
select throws_ok($$ select public.booking_gear(pg_temp.kept('b')::uuid) $$, 'not_found',
  'someone outside the match can''t see its checklist');

select tests.act_as(tests.id('bob'));
select ok((select array_agg(i ->> 'kind' order by ord) = array['ball', 'bibs', 'water', 'referee', 'firstaid']
           from jsonb_array_elements(public.booking_gear(pg_temp.kept('b')::uuid) -> 'items') with ordinality x(i, ord)),
  'the first open fills in the default items, in order');
select is(jsonb_array_length(public.booking_gear(pg_temp.kept('b')::uuid) -> 'items'), 5,
  'opening again adds nothing');
select pg_temp.keep('ball', pg_temp.item(public.booking_gear(pg_temp.kept('b')::uuid), 'ball') ->> 'id');
select ok((select (pg_temp.item(l, 'ball') -> 'assignee' ->> 'name') = 'Bob'
                  and (pg_temp.item(l, 'ball') -> 'assignee' ->> 'is_me')::boolean
                  and (pg_temp.item(l, 'ball') ->> 'ready')::boolean
           from public.claim_gear_item(pg_temp.kept('ball')::uuid, true) l),
  '"I''ll bring it" takes the item and marks it ready');

select tests.act_as(tests.id('cat'));
select ok(not (pg_temp.item(public.booking_gear(pg_temp.kept('b')::uuid), 'ball') -> 'assignee' ->> 'is_me')::boolean
          and not (pg_temp.item(public.booking_gear(pg_temp.kept('b')::uuid), 'ball') -> 'assignee' ? 'id'),
  'others see who brings it by name only');
select throws_ok($$ select public.claim_gear_item(pg_temp.kept('ball')::uuid, true) $$, 'gear_taken',
  'someone else''s item can''t be taken over');
select throws_ok($$ select public.claim_gear_item(pg_temp.kept('ball')::uuid, false) $$, 'gear_taken',
  'nor let go by someone else');
select is(pg_temp.item(public.set_gear_ready(
            (pg_temp.item(public.booking_gear(pg_temp.kept('b')::uuid), 'water') ->> 'id')::uuid, true), 'water') ->> 'ready',
  'true', 'any player can tick an item ready');
select throws_ok(format($$ select public.add_gear_item(%L, 'سماعة') $$, pg_temp.kept('b')),
  'not_organizer', 'only the organizer adds items');

select tests.act_as(tests.id('ana'));
select is(pg_temp.item(public.add_gear_item(pg_temp.kept('b')::uuid, '  شاحن   جوال  '), 'custom') ->> 'name',
  'شاحن جوال', 'the organizer adds a short custom item, tidied');
select throws_ok(format($$ select public.add_gear_item(%L, %L) $$, pg_temp.kept('b'), repeat('x', 41)),
  'invalid_gear_name', 'custom names are short labels, not messages');
select is(pg_temp.item(public.claim_gear_item(pg_temp.kept('ball')::uuid, false), 'ball') -> 'assignee', 'null'::jsonb,
  'the organizer can free anyone''s item');
select is(jsonb_array_length(public.remove_gear_item(
            (pg_temp.item(public.booking_gear(pg_temp.kept('b')::uuid), 'custom') ->> 'id')::uuid) -> 'items'), 5,
  'and remove an item');
-- At most 15 items.
select public.add_gear_item(pg_temp.kept('b')::uuid, 'item ' || g) from generate_series(1, 10) g;
select throws_ok(format($$ select public.add_gear_item(%L, 'one more') $$, pg_temp.kept('b')),
  'too_many_gear_items', 'a checklist holds at most 15 items');

select tests.act_as_postgres();
select ok(public.export_user_data(tests.id('bob')) -> 'gear_claimed' = '[]'::jsonb
          and exists (select 1 from public.booking_gear_items g
                      where g.booking_id = pg_temp.kept('b')::uuid and g.kind = 'water' and g.ready),
  'the export lists what someone said they''d bring (Bob''s ball was freed)');
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'organizer'
where id = pg_temp.kept('b')::uuid;
select tests.act_as(tests.id('bob'));
select throws_ok($$ select public.booking_gear(pg_temp.kept('b')::uuid) $$, 'booking_cancelled',
  'a cancelled match has no checklist');

select * from finish();
rollback;
