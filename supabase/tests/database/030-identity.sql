-- S1 identity: onboarding, profiles, visibility, youth rules, consents, settings, card codes.
-- Contract: agentic_system/contracts/identity-booking.md §4. Spec §6.1, §6.2, §7.
begin;
select plan(74);

-- Fixtures -------------------------------------------------------------------
create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.hood(p_slug text) returns bigint language sql as $$
  select id from public.neighborhoods where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select tests.remember('adult', tests.create_user('adult@nujoom.test'));
select tests.remember('neighbour', tests.create_user('neighbour@nujoom.test'));
select tests.remember('stranger', tests.create_user('stranger@nujoom.test'));
select tests.remember('youth', tests.create_user('youth@nujoom.test'));
select tests.remember('guardian', tests.create_user('guardian@nujoom.test'));
select tests.remember('fresh', tests.create_user('fresh@nujoom.test'));
select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));

-- Clients never write identity tables directly --------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert')
  and not has_table_privilege('authenticated', 'public.profiles', 'update')
  and not has_table_privilege('authenticated', 'public.profiles', 'delete')
  and not has_table_privilege('authenticated', 'public.profile_private', 'insert')
  and not has_table_privilege('authenticated', 'public.profile_private', 'update')
  and not has_table_privilege('authenticated', 'public.consents', 'insert')
  and not has_table_privilege('authenticated', 'public.guardians', 'insert')
  and not has_table_privilege('authenticated', 'public.user_settings', 'update'),
  'clients have no direct write access to identity tables'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'card_code', 'select')
  and not has_column_privilege('anon', 'public.profiles', 'card_code', 'select'),
  'card codes are not readable from the profiles table'
);
select ok(
  not has_function_privilege('anon', 'public.me()', 'execute')
  and not has_function_privilege('anon', 'public.complete_onboarding(text, date, bigint, bigint, public.player_position, jsonb, public.dominant_foot, text, public.profile_visibility, integer)', 'execute'),
  'anon cannot call the identity RPCs'
);

-- Before onboarding --------------------------------------------------------------
select tests.act_as(tests.id('fresh'));
select is(public.me() ->> 'stage', 'onboarding', 'a new account starts at onboarding');
select throws_ok($$ select public.update_profile('{"display_name":"X Y"}') $$, 'not_onboarded',
  'profile edits need onboarding first');

-- Adult onboarding --------------------------------------------------------------
select tests.act_as(tests.id('adult'));
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(25), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents() - 'privacy') $$,
  'consent_required', 'the privacy consent is required');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(25), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', jsonb_set(pg_temp.consents(), '{terms}', '"2020-01-01"')) $$,
  'consent_outdated', 'an outdated consent version is rejected');
select throws_ok(
  $$ select public.complete_onboarding('A', pg_temp.years_ago(25), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents()) $$,
  'invalid_name', 'names need at least two characters');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(25), pg_temp.city('amman'),
       null, 'FWD', pg_temp.consents()) $$,
  'invalid_neighborhood', 'a neighbourhood is required in a city that has them');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(25), pg_temp.city('amman'),
       (select id from public.neighborhoods where city_id <> pg_temp.city('amman') limit 1), 'FWD', pg_temp.consents()) $$,
  'invalid_neighborhood', 'the neighbourhood must belong to the chosen city');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(12), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents()) $$,
  'below_min_age', 'under-13s are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', private.amman_today() + 1, pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents()) $$,
  'dob_in_future', 'a birth date in the future is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Ahmad', pg_temp.years_ago(25), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents(), null, 'Bad Handle!') $$,
  'invalid_handle', 'handles are lower-case letters, digits, dots and underscores');

select is(
  public.complete_onboarding('  Ahmad Malki ', pg_temp.years_ago(25), pg_temp.city('amman'),
    pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents(), 'right', 'Malki.87') ->> 'stage',
  'app', 'an adult with current consents lands in the app');
select is(public.me() ->> 'display_name', 'Ahmad Malki', 'the name is trimmed');
select is(public.me() ->> 'handle', 'malki.87', 'the handle is stored lower-case');
select is(public.me() ->> 'visibility', 'city', 'onboarding defaults adults to city visibility');
select ok((public.me() ->> 'card_code') ~ '^NJM-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$',
  'a long random card code is issued');
select is((public.me() ->> 'is_youth')::boolean, false, 'a 25-year-old is an adult');
select is((public.me() ->> 'can_join_recorded')::boolean, true, 'adults can join recorded matches');
select is(
  (select count(*)::integer from public.consents where user_id = tests.id('adult') and granted and given_by = tests.id('adult')),
  3, 'terms, privacy and recording consents are stored');
select is(
  (select count(*)::integer from public.consents where user_id = tests.id('adult') and type = 'streaming'),
  0, 'streaming consent is never collected at onboarding');
select is((public.me() ->> 'recording_consent')::boolean, true, 'the recording yes is stored');
select throws_ok(
  $$ select public.complete_onboarding('Again', pg_temp.years_ago(25), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'FWD', pg_temp.consents()) $$,
  'already_onboarded', 'onboarding runs once');

-- Neighbour (same city) and stranger (other city, no neighbourhoods) -----------------
select tests.act_as(tests.id('neighbour'));
select throws_ok(
  $$ select public.complete_onboarding('Omar', pg_temp.years_ago(22), pg_temp.city('amman'),
       pg_temp.hood('weibdeh'), 'MID', pg_temp.consents(), null, 'malki.87') $$,
  'handle_taken', 'handles are unique');
select lives_ok(
  $$ select public.complete_onboarding('Omar', pg_temp.years_ago(22), pg_temp.city('amman'),
       pg_temp.hood('weibdeh'), 'MID', pg_temp.consents()) $$,
  'handles are optional');

select tests.act_as(tests.id('stranger'));
select is(
  public.complete_onboarding('Saif', pg_temp.years_ago(30), pg_temp.city('zarqa'),
    null, 'DEF', jsonb_set(pg_temp.consents(), '{recording}', 'false')) ->> 'stage',
  'app', 'declining recording never blocks the account (and a city without neighbourhoods needs none)');
select is((public.me() ->> 'can_join_recorded')::boolean, false,
  'without recording permission, recorded matches are closed');
select is(
  (select granted from public.consents where user_id = tests.id('stranger') and type = 'recording'),
  false, 'the recording no is stored as a choice');
select is(
  (public.record_consent('recording', pg_temp.consents() ->> 'recording', true) ->> 'can_join_recorded')::boolean,
  true, 'giving recording permission later opens recorded matches');

-- Visibility ------------------------------------------------------------------------
select tests.act_as(tests.id('neighbour'));
select ok(exists (select 1 from public.profiles where id = tests.id('adult')),
  'a same-city player sees a city-visible adult');
select is(public.player_profile(tests.id('adult')) ->> 'display_name', 'Ahmad Malki',
  'player_profile returns what the viewer may see');
select ok(not exists (select 1 from public.profile_private where user_id = tests.id('adult')),
  'nobody else reads a date of birth');

select tests.act_as(tests.id('stranger'));
select ok(not exists (select 1 from public.profiles where id = tests.id('adult')),
  'a player from another city does not see a city-visible adult');
select is(public.player_profile(tests.id('adult')), null,
  'a hidden profile returns nothing, so its existence does not leak');

select tests.act_as_anon();
select ok(not exists (select 1 from public.profiles where id = tests.id('adult')),
  'anon does not see a city-visible profile');

select tests.act_as(tests.id('adult'));
select is(public.set_visibility('public') ->> 'visibility', 'public', 'adults choose their visibility');
select tests.act_as_anon();
select ok(exists (select 1 from public.profiles where id = tests.id('adult')), 'anon sees public profiles');
select tests.act_as(tests.id('stranger'));
select ok(exists (select 1 from public.profiles where id = tests.id('adult')), 'anyone signed in sees public profiles');
select tests.act_as(tests.id('adult'));
select is(public.set_visibility('private') ->> 'visibility', 'private', 'adults can go private');
select tests.act_as(tests.id('neighbour'));
select ok(not exists (select 1 from public.profiles where id = tests.id('adult')),
  'a private profile is hidden even from the same city');

-- Profile edits ---------------------------------------------------------------------
select tests.act_as(tests.id('adult'));
select is(
  (select public.me() ->> 'card_code') = (public.update_profile('{"display_name":"Ahmad M.","shirt_number":10}') ->> 'card_code'),
  true, 'editing the profile keeps the card code');
select is(public.me() ->> 'shirt_number', '10', 'the shirt number is saved');
select throws_ok($$ select public.update_profile(jsonb_build_object('avatar_path', tests.id('stranger')::text || '/a.jpg')) $$,
  'invalid_avatar', 'an avatar must live in the owner''s own folder');
select throws_ok($$ select public.update_profile('{"is_youth":false}') $$, 'invalid_patch',
  'derived fields cannot be patched');
select throws_ok($$ select public.update_profile('{"shirt_number":100}') $$, 'invalid_shirt_number',
  'shirt numbers are 1 to 99');
select throws_ok($$ select public.update_profile('{"position":"STRIKER"}') $$, 'invalid_patch',
  'unknown positions are rejected');
select lives_ok($$ select public.update_profile(jsonb_build_object('city_id', pg_temp.city('zarqa'))) $$,
  'moving to a city without neighbourhoods clears the neighbourhood');
select throws_ok($$ select public.update_profile(jsonb_build_object('city_id', pg_temp.city('amman'))) $$,
  'invalid_neighborhood', 'moving to Amman needs a neighbourhood');

-- Settings and consents -------------------------------------------------------------
select is(public.set_settings('{"share_presence":true,"locale":"en"}') -> 'settings' ->> 'share_presence', 'true',
  'adults can share their presence');
select throws_ok($$ select public.set_settings('{"locale":"fr"}') $$, 'invalid_patch', 'only ar and en');
select throws_ok($$ select public.record_consent('streaming', '1', true) $$, 'streaming_not_available',
  'streaming consent cannot be granted before M9');
select lives_ok($$ select public.record_consent('streaming', '1', false) $$, 'a "no live" opt-out is recorded');
select throws_ok($$ select public.record_consent('terms', '2020-01-01', true) $$, 'invalid_consent',
  'only the current version can be accepted');

select tests.act_as_postgres();
update public.config set value = jsonb_set(value, '{terms}', '"2026-12-01"') where key = 'consent_versions';
select tests.act_as(tests.id('adult'));
select is(public.me() ->> 'stage', 'consent', 'a new terms version sends users through re-consent');
select is(public.record_consent('terms', '2026-12-01', true) ->> 'stage', 'app', 're-accepting returns them to the app');

select tests.act_as_postgres();
select throws_ok($$ update public.consents set granted = false where user_id = tests.id('adult') $$,
  '42501', null, 'consents are append-only even for the database owner');

-- Youth -----------------------------------------------------------------------------
select tests.act_as(tests.id('youth'));
select is(
  public.complete_onboarding('Yazan', pg_temp.years_ago(15), pg_temp.city('amman'),
    pg_temp.hood('jabal-al-hussein'), 'MID', pg_temp.consents(), null, null, 'public') ->> 'stage',
  'guardian', 'a youth without a guardian is sent to name one');
select is(public.me() ->> 'visibility', 'private', 'youth are private whatever they ask for');
select is(public.me() ->> 'age_group', 'U16', 'a 15-year-old is U16');
select is((public.me() ->> 'can_join_recorded')::boolean, false, 'youth cannot join recorded matches without a guardian');
select throws_ok($$ select public.set_visibility('public') $$, 'guardian_controls_visibility',
  'youth cannot change their own visibility');
select throws_ok($$ select public.set_settings('{"share_presence":true}') $$, 'youth_presence_hidden',
  'youth presence is never shared');

select tests.act_as(tests.id('guardian'));
select lives_ok(
  $$ select public.complete_onboarding('Parent', pg_temp.years_ago(45), pg_temp.city('amman'),
       pg_temp.hood('jabal-al-hussein'), 'DEF', pg_temp.consents()) $$,
  'the guardian is an adult player too');
select tests.act_as_postgres();
insert into public.guardians (youth_user_id, contact_email, guardian_user_id, status, visibility_choice, confirmed_at)
values (tests.id('youth'), 'guardian@nujoom.test', tests.id('guardian'), 'confirmed', 'city', now());

select tests.act_as(tests.id('youth'));
select is(public.me() ->> 'visibility', 'city', 'a confirmed guardian''s choice sets the youth''s visibility');
select is((public.me() ->> 'can_join_recorded')::boolean, false,
  'a guardian link alone does not permit recording a youth');
select tests.act_as_postgres();
insert into public.consents (user_id, type, version, granted, given_by)
values (tests.id('youth'), 'recording', pg_temp.consents() ->> 'recording', true, tests.id('guardian'));
select tests.act_as(tests.id('youth'));
select is((public.me() ->> 'can_join_recorded')::boolean, true,
  'the youth''s yes plus a confirmed guardian''s yes unlock recorded matches');
select lives_ok($$ select public.record_consent('recording', null, false) $$,
  'a youth can withdraw their own recording permission');
select is((public.me() ->> 'can_join_recorded')::boolean, false, 'and either no closes recorded matches again');
select tests.act_as(tests.id('neighbour'));
select ok(not exists (select 1 from public.profiles where id = tests.id('youth')),
  'city visibility never opens a youth profile to the city');
select tests.act_as(tests.id('guardian'));
select ok(exists (select 1 from public.profile_private where user_id = tests.id('youth')),
  'a confirmed guardian reads the youth''s birth date');

-- Maintenance -----------------------------------------------------------------------
select tests.act_as_postgres();
update public.profile_private set dob = pg_temp.years_ago(18) where user_id = tests.id('youth');
update public.profiles set is_youth = true, age_group = 'U18' where id = tests.id('youth');
select is(private.refresh_age_groups(), 1, 'the nightly job moves a new adult out of youth');
select is((select age_group::text from public.profiles where id = tests.id('youth')), 'ADULT',
  'and into the adult group');

select is(
  array[private.hit_rate_limit('t:x', interval '1 hour', 2), private.hit_rate_limit('t:x', interval '1 hour', 2),
        private.hit_rate_limit('t:x', interval '1 hour', 2)],
  array[true, true, false], 'rate limits allow p_max hits per window');

select * from finish();
rollback;
