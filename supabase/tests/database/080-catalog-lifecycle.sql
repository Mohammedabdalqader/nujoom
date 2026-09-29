-- D1b part 1: the verification lifecycle through the real RPCs (contract §9 cases 5–7, 7a, 7b, 12).
begin;
select plan(34);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.listing(p_pitch uuid) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.search_pitches('{"limit":50}') -> 'items') x
  where x ->> 'pitch_id' = p_pitch::text $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));
select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('stranger', tests.create_user('stranger@nujoom.test'));
select tests.remember('teen', tests.create_user('teen@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.complete_onboarding('Owner', pg_temp.years_ago(40), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());
select tests.act_as(tests.id('stranger'));
select public.complete_onboarding('Stranger', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('teen'));
select public.complete_onboarding('Teen', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'FWD', pg_temp.consents());

-- Only admins manage listings (case 5) -------------------------------------------------------------
select tests.act_as(tests.id('stranger'));
select throws_ok(
  $$ select public.admin_create_listing('{"city_id":1,"name_ar":"x"}', '[{}]') $$,
  'forbidden', 'a player cannot create listings');
select throws_ok(
  $$ select public.admin_set_participation(gen_random_uuid(), 'verified', 'x') $$,
  'forbidden', 'or grant a badge');

-- Create, review, publish --------------------------------------------------------------------------
select tests.act_as(tests.id('admin'));
select tests.remember('fac', public.admin_create_listing(
  jsonb_build_object('city_id', pg_temp.city('zarqa'), 'name_ar', 'ملاعب النجمة',
                     'lat', 32.07, 'lng', 36.09, 'location_confidence', 'map_checked',
                     'access', 'public_rental'),
  '[{"label_ar":"ملعب 1","players_per_side":5,"surface":"artificial_turf","amenities":["parking"]},
    {"label_ar":"ملعب 2"}]', 'field_team'));
-- (Direct table reads need the database role: clients have no table access at all.)
select tests.act_as_postgres();
select tests.remember('pa', (select id from public.pitches where facility_id = tests.id('fac') and label_ar = 'ملعب 1'));
select tests.remember('pb', (select id from public.pitches where facility_id = tests.id('fac') and label_ar = 'ملعب 2'));
select is((select listing_state::text from public.facilities where id = tests.id('fac')), 'candidate',
  'a new listing starts as a candidate');
select is(
  (select count(*)::integer from public.pitch_evidence
   where pitch_id = tests.id('pa') and source_kind = 'field_team'),
  4, 'each fact records where it came from');
select tests.act_as(tests.id('admin'));
select throws_ok(
  format($$ select public.admin_review_listing('facility', %L, 'mark_duplicate') $$, tests.id('fac')),
  'duplicate_of_required', 'a duplicate needs its original');
select lives_ok(format($$ select public.admin_review_listing('facility', %L, 'publish', '{}', 'reviewed_on_site');
                          select public.admin_review_listing('pitch', %L, 'publish');
                          select public.admin_review_listing('pitch', %L, 'publish') $$,
                       tests.id('fac'), tests.id('pa'), tests.id('pb')),
  'an admin publishes the facility and its fields');
select tests.remember('school', public.admin_create_listing(
  jsonb_build_object('city_id', pg_temp.city('zarqa'), 'name_ar', 'ملعب مدرسة', 'access', 'school_only'),
  '[{}]'));
select throws_ok(format($$ select public.admin_review_listing('facility', %L, 'publish') $$, tests.id('school')),
  'access_not_public', 'a school field is refused with a clear reason');
select lives_ok(
  format($$ select public.admin_review_listing('pitch', %L, 'update_facts', '{"facts":{"amenities":[]}}') $$,
         tests.id('pb')),
  'a reviewer records "checked, no amenities"');
select tests.act_as_postgres();
select is((select amenities from public.pitches where id = tests.id('pb')), '{}'::text[],
  'stored as an empty list, not unknown');

-- A player sees both fields, neither bookable ----------------------------------------------------------
select tests.act_as(tests.id('stranger'));
select is((select jsonb_agg(pg_temp.listing(p) ->> 'badge') from unnest(array[tests.id('pa'), tests.id('pb')]) p),
  '["not_verified", "not_verified"]'::jsonb, 'published fields are searchable as not verified');

-- Claims (cases 6, 7) ----------------------------------------------------------------------------------------
select tests.act_as(tests.id('teen'));
select throws_ok(format($$ select public.claim_facility(%L) $$, tests.id('fac')), 'not_adult',
  'a youth cannot claim a venue');
select tests.act_as(tests.id('owner'));
select tests.remember('claim', public.claim_facility(tests.id('fac')));
select throws_ok(format($$ select public.claim_facility(%L) $$, tests.id('fac')), 'claim_exists',
  'one open claim per person and venue');
select throws_ok(format($$ select public.owner_confirm_field(%L, '{"lights":true}') $$, tests.id('pa')),
  'forbidden', 'a claim alone gives no rights');
select tests.act_as(tests.id('admin'));
select is(public.admin_decide_claim(tests.id('claim'), 'approve', 'licence_checked') ->> 'status', 'approved',
  'the admin approves the claim');
select tests.act_as_postgres();
select is((select operator_state::text from public.facilities where id = tests.id('fac')), 'claimed',
  'the facility is claimed');
select is((select participation::text from public.pitches where id = tests.id('pa')), 'not_verified',
  'approving a claim never flips the badge (case 6)');
select tests.act_as(tests.id('admin'));
select throws_ok(
  format($$ select public.admin_set_participation(%L, 'verified', 'too_early') $$, tests.id('pa')),
  'operator_not_verified', 'no badge while authority is unverified (case 6)');

-- Staff stage their field privately (7b) --------------------------------------------------------------------
select tests.act_as(tests.id('stranger'));
select throws_ok(format($$ select public.owner_confirm_field(%L, '{"lights":true}') $$, tests.id('pa')),
  'forbidden', 'someone else cannot edit the field (case 7)');
select throws_ok(format($$ select public.owner_set_schedule_active(%L, true) $$, tests.id('pa')),
  'forbidden', 'or stage its schedule (case 7)');
select tests.act_as(tests.id('owner'));
select lives_ok(
  format($$ select public.owner_confirm_field(%L, '{"lights":true,"indoor":false}',
                                               '{"price_per_hour":25,"slot_minutes":60,"opening_hours":{"sun":[["16:00","24:00"]]}}') $$, tests.id('pa')),
  'the owner confirms facts, a price and opening hours');
select tests.act_as(tests.id('admin'));
select public.admin_verify_authority(tests.id('fac'), '{"document":"municipal_licence"}');
select throws_ok(
  format($$ select public.admin_set_participation(%L, 'verified', 'setup_done') $$, tests.id('pa')),
  'schedule_not_active', 'no badge while the schedule is inactive (7b)');
select tests.act_as(tests.id('owner'));
select public.owner_set_schedule_active(tests.id('pa'), true);
select tests.act_as(tests.id('stranger'));
select is(pg_temp.listing(tests.id('pa')) -> 'operations', 'null'::jsonb,
  'an active but unverified schedule stays private (7b)');
select tests.act_as_postgres();
select is(private.pitch_is_bookable(tests.id('pa')), false, 'and cannot be booked (7b)');

-- The badge (7a) --------------------------------------------------------------------------------------------------
select tests.act_as(tests.id('admin'));
select public.admin_set_participation(tests.id('pa'), 'verified', 'setup_done', '{"visit":"2026-09-28"}');
select tests.act_as(tests.id('stranger'));
select is(pg_temp.listing(tests.id('pa')) ->> 'badge', 'verified', 'the field is verified (7a)');
select is((pg_temp.listing(tests.id('pa')) -> 'operations' ->> 'bookable')::boolean, true,
  'bookable, with its operations public (7a)');
select is(pg_temp.listing(tests.id('pb')) ->> 'badge', 'not_verified',
  'the facility''s other field keeps its own badge');

-- Pause, then the partnership ends -------------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select public.owner_set_schedule_active(tests.id('pa'), false);
select tests.act_as(tests.id('stranger'));
select is(pg_temp.listing(tests.id('pa')) ->> 'badge' || '|' || (pg_temp.listing(tests.id('pa')) -> 'operations' ->> 'bookable'),
  'verified|false', 'a pause keeps the badge but withholds booking');
select tests.act_as(tests.id('admin'));
select public.admin_set_participation(tests.id('pa'), 'not_verified', 'partnership_ended');
select tests.act_as(tests.id('stranger'));
select is(pg_temp.listing(tests.id('pa')) ->> 'badge' || '|' || coalesce(pg_temp.listing(tests.id('pa')) ->> 'operations', 'none'),
  'not_verified|none', 'an ended partnership downgrades at once and hides the operations');

-- Records (case 12) ------------------------------------------------------------------------------------------------
select tests.act_as_postgres();
select is(
  (select jsonb_agg(from_state || '>' || to_state || ':' || reason order by id)
   from public.verification_events where pitch_id = tests.id('pa')),
  '["not_verified>verified:setup_done", "verified>not_verified:partnership_ended"]'::jsonb,
  'every badge change is recorded with its reason');
select ok(
  (select count(*) from public.listing_reviews where facility_id = tests.id('fac')) >= 8,
  'reviews record creation, publishing, facts, the claim, authority and the schedule');
select is(
  (select count(*)::integer from public.audit_log
   where action in ('catalog.participation_verified', 'catalog.participation_not_verified')
     and target_id = tests.id('pa')::text),
  2, 'badge changes are audited');
select throws_ok($$ update public.verification_events set reason = 'edited' $$, '42501', null,
  'the badge history is append-only');

-- Personal records are exported (data rights) ------------------------------------------------------------------------
select tests.act_as_service();
select is(public.export_user_data(tests.id('owner')) -> 'venues_managed' -> 0 ->> 'role', 'owner',
  'a venue owner''s export lists the venues they manage');
select is(public.export_user_data(tests.id('owner')) -> 'venue_claims' -> 0 ->> 'status', 'approved',
  'and their claims');

select * from finish();
rollback;
