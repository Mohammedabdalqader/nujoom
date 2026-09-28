-- D1b part 2a: player reports and operator outreach (contract §9 cases 5, 11, 12; §3; §8).
begin;
select plan(29);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));
select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('ben', tests.create_user('ben@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('ben'));
select public.complete_onboarding('Ben', pg_temp.years_ago(23), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());

-- A published partner venue with one verified field, and an unpublished candidate.
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, lat, lng, location_confidence, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 32.07, 36.09,
        'map_checked', 'public_rental', 'published', 'authority_verified'),
       ('00000000-0000-4000-8000-0000000000f2', 'ملاعب القمر', pg_temp.city('zarqa'), 32.08, 36.1,
        'map_checked', 'public_rental', 'published', 'none'),
       ('00000000-0000-4000-8000-0000000000f9', 'ملعب مرشح', pg_temp.city('zarqa'), null, null,
        'unchecked', 'public_rental', 'candidate', 'none');
insert into public.pitches (id, facility_id, players_per_side, listing_state) values
  ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 5, 'published'),
  ('00000000-0000-4000-8000-00000000002a', '00000000-0000-4000-8000-0000000000f2', 7, 'published');
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active)
values ('00000000-0000-4000-8000-00000000001a', 25, 60, true);
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000001a';

-- Access (case 5) -------------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.community_submissions', 'select')
  and not has_table_privilege('authenticated', 'public.facility_contacts', 'select')
  and not has_table_privilege('authenticated', 'public.outreach_attempts', 'select'),
  'clients never read reports, contacts or outreach directly'
);

-- Reports (case 11) ------------------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select is(
  public.submit_catalog_report('missing_pitch', null, null,
    jsonb_build_object('name', 'ملعب الحي الجديد', 'city_id', pg_temp.city('zarqa'), 'lat', 32.06, 'lng', 36.08)) ->> 'status',
  'pending', 'a player reports a missing pitch');
select throws_ok(
  format($$ select public.submit_catalog_report('missing_pitch', null, null, '{"name":"x","city_id":%s}') $$, pg_temp.city('zarqa')),
  'invalid_report', 'a missing pitch needs a real name');
select throws_ok(
  format($$ select public.submit_catalog_report('missing_pitch', null, null, '{"name":"ملعب","city_id":%s,"comment":"hi"}') $$, pg_temp.city('zarqa')),
  'invalid_report', 'and nothing but the structured fields (no free text)');
select lives_ok(
  $$ select public.submit_catalog_report('wrong_details', '00000000-0000-4000-8000-00000000002a', null,
                                          '{"players_per_side":5,"lights":true}') $$,
  'a player corrects a field''s details');
select throws_ok(
  $$ select public.submit_catalog_report('wrong_details', '00000000-0000-4000-8000-00000000002a', null,
                                          '{"surface":"lava"}') $$,
  'invalid_report', 'with real values only');
select throws_ok(
  $$ select public.submit_catalog_report('closed', null, '00000000-0000-4000-8000-0000000000f2', '{"why":"x"}') $$,
  'invalid_report', 'a closure report carries no text');
select lives_ok(
  $$ select public.submit_catalog_report('closed', null, '00000000-0000-4000-8000-0000000000f2') $$,
  'but can be sent');
select throws_ok(
  $$ select public.submit_catalog_report('wrong_location', null, '00000000-0000-4000-8000-0000000000f2',
                                          '{"lat":51.5,"lng":-0.1}') $$,
  'invalid_report', 'a corrected location must be in Jordan');
select throws_ok(
  $$ select public.submit_catalog_report('closed', null, '00000000-0000-4000-8000-0000000000f9') $$,
  'not_found', 'only published places can be reported');
select lives_ok(
  $$ select public.submit_catalog_report('duplicate', null, '00000000-0000-4000-8000-0000000000f2',
                                          '{"duplicate_of":"00000000-0000-4000-8000-0000000000f1"}') $$,
  'a duplicate report names the original');
select lives_ok(
  $$ select public.submit_catalog_report('wrong_location', null, '00000000-0000-4000-8000-0000000000f2',
                                          '{"lat":32.081,"lng":36.101}') $$,
  'a corrected location inside Jordan is accepted (invalid reports did not use up the daily limit)');
select throws_ok(
  $$ select public.submit_catalog_report('closed', null, '00000000-0000-4000-8000-0000000000f1') $$,
  'rate_limited', 'five reports a day');
select is(jsonb_array_length(public.my_catalog_reports()), 5, 'the reporter sees their own reports');

select tests.act_as(tests.id('ben'));
select is(public.my_catalog_reports(), '[]'::jsonb, 'nobody else does');
select throws_ok($$ select public.admin_catalog_reports() $$, 'forbidden', 'nor the review queue');

select tests.act_as(tests.id('admin'));
select is(jsonb_array_length(public.admin_catalog_reports()), 5, 'admins see the pending queue');
select is(
  public.admin_decide_report((public.admin_catalog_reports() -> 0 ->> 'id')::uuid, 'accepted', 'added_after_visit') ->> 'status',
  'accepted', 'and decide a report');

-- Outreach (§3) --------------------------------------------------------------------------------------
select tests.act_as(tests.id('ben'));
select throws_ok(
  $$ select public.admin_log_outreach('00000000-0000-4000-8000-0000000000f2', 'phone', 'no_answer') $$,
  'forbidden', 'players cannot log outreach');
select tests.act_as(tests.id('admin'));
select throws_ok(
  $$ select public.admin_add_contact('00000000-0000-4000-8000-0000000000f2', 'Abu Ali', '0791234567', null) $$,
  '23514', null, 'contact phones are E.164');
select lives_ok(
  $$ select public.admin_add_contact('00000000-0000-4000-8000-0000000000f2', 'Abu Ali', '+962791234567', null);
     select public.admin_add_contact('00000000-0000-4000-8000-0000000000f1', 'Umm Sami', null, 'owner@example.com') $$,
  'admins record operator contacts');
select is(
  array[public.admin_log_outreach('00000000-0000-4000-8000-0000000000f2', 'phone', 'no_answer')::text,
        public.admin_log_outreach('00000000-0000-4000-8000-0000000000f2', 'visit', 'interested', 'Asked for a callback', '2026-10-05')::text],
  array['contacted', 'responded'], 'outreach moves the operator state forward');
select is(public.admin_log_outreach('00000000-0000-4000-8000-0000000000f1', 'phone', 'interested')::text,
  'authority_verified', 'and never undoes a verified partnership');

select tests.act_as(tests.id('ana'));
select is(
  (select x ->> 'badge' from jsonb_array_elements(public.search_pitches() -> 'items') x
   where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001a'), 'verified',
  'contacting an operator never changes a badge');

select tests.act_as(tests.id('admin'));
select is(public.admin_log_outreach('00000000-0000-4000-8000-0000000000f1', 'phone', 'opted_out')::text,
  'opted_out', 'an operator opts out');
select tests.act_as_postgres();
select is(
  (select count(*)::integer from public.facility_contacts where facility_id = '00000000-0000-4000-8000-0000000000f1'),
  0, 'their contacts are deleted');
select is(
  (select participation::text || '|' || (select reason from public.verification_events
                                          where pitch_id = '00000000-0000-4000-8000-00000000001a'
                                          order by id desc limit 1)
   from public.pitches where id = '00000000-0000-4000-8000-00000000001a'),
  'not_verified|operator_opted_out', 'and their fields lose the badge at once, recorded');

-- Account deletion keeps the report without the person; the export lists it (§8) ---------------------
select tests.act_as_service();
select is(jsonb_array_length(public.export_user_data(tests.id('ana')) -> 'pitch_reports'), 5,
  'a player''s export lists their reports');
select tests.act_as_postgres();
delete from auth.users where id = tests.id('ana');
select is(
  (select count(*)::integer from public.community_submissions where user_id is null),
  5, 'after deletion the reports stay, anonymised');

select * from finish();
rollback;
