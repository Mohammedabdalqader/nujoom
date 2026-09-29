-- Venue staff: invite links, roles and removal (D-068).
begin;
select plan(27);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
-- Links are text (tokens) and jsonb, so they are kept as settings rather than tests.remember uuids.
create function pg_temp.keep(p_name text, p_value text) returns text language sql as $$
  select set_config('staff.' || p_name, p_value, true) $$;
create function pg_temp.val(p_name text) returns text language sql as $$
  select current_setting('staff.' || p_name) $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('helper', tests.create_user('helper@nujoom.test'));
select tests.remember('second', tests.create_user('second@nujoom.test'));
select tests.remember('stranger', tests.create_user('stranger@nujoom.test'));
select tests.remember('kid', tests.create_user('kid@nujoom.test'));
select tests.remember('noprofile', tests.create_user('noprofile@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.create_owner_profile('Abu Sami', '1980-05-05', true);
select tests.act_as(tests.id('helper'));
select public.create_owner_profile('Hamza', '1995-02-02', true);
select tests.act_as(tests.id('second'));
select public.create_owner_profile('Yousef', '1990-03-03', true);
select tests.act_as(tests.id('stranger'));
select public.create_owner_profile('Stranger', '1985-04-04', true);
select tests.act_as(tests.id('kid'));
select public.complete_onboarding('Kid', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'claimed');
insert into public.pitches (id, facility_id, listing_state)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'published');
insert into public.pitch_staff (facility_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'), 'owner');

select ok(not has_table_privilege('authenticated', 'public.staff_invites', 'select'),
  'clients never read invite links directly');

-- Creating a link ------------------------------------------------------------------------------------
select tests.act_as(tests.id('stranger'));
select throws_ok($$ select public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') $$,
  'forbidden', 'only the venue''s owner creates staff links');
select tests.act_as(tests.id('owner'));
select pg_temp.keep('link', public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') ->> 'token');
select tests.act_as_postgres();
select is((select count(*)::integer from public.staff_invites where token_hash = pg_temp.val('link')), 0,
  'the token itself is never stored');

-- Joining ---------------------------------------------------------------------------------------------
select tests.act_as(tests.id('helper'));
select is(public.staff_invite_preview(pg_temp.val('link')) -> 'name' ->> 'ar', 'ملاعب الشمس',
  'the invited person sees which venue it is');
select tests.act_as_anon();
select throws_ok(format($$ select public.staff_invite_preview(%L) $$, pg_temp.val('link')), '42501', null,
  'signed-out visitors cannot look links up');
select tests.act_as(tests.id('kid'));
select throws_ok(format($$ select public.accept_staff_invite(%L) $$, pg_temp.val('link')),
  'not_adult', 'a minor cannot join a venue''s staff');
select tests.act_as(tests.id('noprofile'));
select throws_ok(format($$ select public.accept_staff_invite(%L) $$, pg_temp.val('link')),
  'not_adult', 'nor someone without an adult profile');
select tests.act_as(tests.id('helper'));
select is(public.accept_staff_invite(pg_temp.val('link')), '00000000-0000-4000-8000-0000000000f1'::uuid,
  'an adult joins with the link');
select is(public.my_venues() -> 0 ->> 'role', 'staff', 'and sees the venue as staff');
select is(public.my_venues() -> 0 -> 'team', 'null'::jsonb, 'staff don''t see the team list');
select tests.act_as(tests.id('owner'));
select is(
  (select jsonb_agg(t ->> 'name' order by t ->> 'name') from jsonb_array_elements(public.my_venues() -> 0 -> 'team') t),
  '["Abu Sami", "Hamza"]'::jsonb, 'the owner sees who is on the team');
select ok(public.my_venues() -> 0 -> 'links' = '[]'::jsonb and public.my_venues()::text not like '%token%',
  'used links drop off the list, and tokens never appear');
select tests.act_as(tests.id('stranger'));
select throws_ok(format($$ select public.accept_staff_invite(%L) $$, pg_temp.val('link')),
  'invalid_staff_invite', 'a link works once');

-- What staff may do ----------------------------------------------------------------------------------
select tests.act_as(tests.id('helper'));
select throws_ok($$ select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{"lights":true}',
                      '{"price_per_hour":5,"slot_minutes":60}') $$,
  'forbidden', 'staff cannot change prices or field details');
select throws_ok($$ select public.owner_set_schedule_active('00000000-0000-4000-8000-00000000001a', true) $$,
  'forbidden', 'nor switch the schedule');
select throws_ok($$ select public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') $$,
  'forbidden', 'nor invite others');
select lives_ok($$ select public.add_pitch_media('00000000-0000-4000-8000-0000000000f1', null,
                     '00000000-0000-4000-8000-0000000000f1/staff.jpg', 'owner_granted') $$,
  'but they can add photos for review');
select throws_ok(format($$ select public.remove_staff('00000000-0000-4000-8000-0000000000f1', %L) $$, tests.id('owner')),
  'forbidden', 'and can never remove the owner');
select tests.act_as(tests.id('owner'));
select lives_ok($$ select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
                     '{"price_per_hour":20,"slot_minutes":60}') $$,
  'the owner still runs prices');

-- Revoked, expired and too many links; an owner removes a staff member ----------------------------------
select pg_temp.keep('revoked', public.create_staff_invite('00000000-0000-4000-8000-0000000000f1')::text);
select public.revoke_staff_invite((pg_temp.val('revoked')::jsonb ->> 'id')::uuid);
select pg_temp.keep('old', public.create_staff_invite('00000000-0000-4000-8000-0000000000f1')::text);
select pg_temp.keep('second', public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') ->> 'token');
select tests.act_as_postgres();
update public.staff_invites set expires_at = now() - interval '1 minute'
where id = (pg_temp.val('old')::jsonb ->> 'id')::uuid;
select tests.act_as(tests.id('second'));
select throws_ok(format($$ select public.staff_invite_preview(%L) $$, pg_temp.val('revoked')::jsonb ->> 'token'),
  'invalid_staff_invite', 'a revoked link no longer works');
select throws_ok(format($$ select public.staff_invite_preview(%L) $$, pg_temp.val('old')::jsonb ->> 'token'),
  'invalid_staff_invite', 'nor an expired one');
select public.accept_staff_invite(pg_temp.val('second'));
select tests.act_as(tests.id('owner'));
select public.remove_staff('00000000-0000-4000-8000-0000000000f1', tests.id('second'));
select tests.act_as_postgres();
select is((select count(*)::integer from public.pitch_staff where user_id = tests.id('second')), 0,
  'the owner can remove a staff member');
select tests.act_as(tests.id('owner'));
select public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') from generate_series(1, 5);
select throws_ok($$ select public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') $$,
  'staff_link_limit', 'at most five open links per venue');

-- Leaving and removal ------------------------------------------------------------------------------------
select tests.act_as(tests.id('helper'));
select public.remove_staff('00000000-0000-4000-8000-0000000000f1', tests.id('helper'));
select is(public.my_venues(), '[]'::jsonb, 'staff can leave');
select tests.act_as_postgres();
select is(
  (select jsonb_agg(action order by id) from public.audit_log where action like 'venue.staff%'),
  '["venue.staff_invite_created", "venue.staff_joined", "venue.staff_invite_created", "venue.staff_invite_revoked", "venue.staff_invite_created", "venue.staff_invite_created", "venue.staff_joined", "venue.staff_removed", "venue.staff_invite_created", "venue.staff_invite_created", "venue.staff_invite_created", "venue.staff_invite_created", "venue.staff_invite_created", "venue.staff_left"]'::jsonb,
  'every step is audited');
select ok(
  jsonb_array_length(public.export_user_data(tests.id('owner')) -> 'staff_links') = 9
  and public.export_user_data(tests.id('owner'))::text not like '%token%'
  and public.export_user_data(tests.id('owner'))::text not like '%Hamza%',
  'the owner''s data export lists their links, without tokens or who joined');

-- A link dies with its maker's ownership.
select tests.act_as_postgres();
update public.staff_invites set revoked_at = now() where accepted_at is null and revoked_at is null;
select tests.act_as(tests.id('owner'));
select pg_temp.keep('orphan', public.create_staff_invite('00000000-0000-4000-8000-0000000000f1') ->> 'token');
select tests.act_as_postgres();
update public.pitch_staff set role = 'staff' where user_id = tests.id('owner');
select tests.act_as(tests.id('stranger'));
select throws_ok(format($$ select public.accept_staff_invite(%L) $$, pg_temp.val('orphan')),
  'invalid_staff_invite', 'a link stops working once its maker is no longer an owner');

select * from finish();
rollback;
