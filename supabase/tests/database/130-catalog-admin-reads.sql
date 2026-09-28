-- Admin read side of the catalog (D-053).
begin;
select plan(11);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));
select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.complete_onboarding('Owner', pg_temp.years_ago(40), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());

-- One published venue with a claim and a report; one candidate from an import.
select tests.act_as(tests.id('admin'));
select tests.remember('pub', public.admin_create_listing(
  jsonb_build_object('city_id', pg_temp.city('zarqa'), 'name_ar', 'ملاعب الشمس', 'access', 'public_rental'),
  '[{"label_ar":"ملعب 1","players_per_side":5}]', 'field_team'));
select public.admin_review_listing('facility', tests.id('pub'), 'publish');
select public.admin_review_listing('pitch', (select public.admin_catalog_detail(tests.id('pub')) -> 'fields' -> 0 ->> 'id')::uuid, 'publish');
select tests.act_as(tests.id('owner'));
select public.claim_facility(tests.id('pub'));
select public.submit_catalog_report('closed', null, tests.id('pub'));
select tests.act_as_service();
select tests.remember('run', public.import_start_run('nujoom_research', 'b1'));
select public.import_catalog_record(tests.id('run'), 'research-notes', jsonb_build_object(
  'id', 'zarqa-test-field', 'publication', 'unpublished', 'participation', 'not_verified', 'operations', null,
  'facilityNameAr', 'ملعب الاختبار', 'city', 'Zarqa', 'playersPerSide', 7,
  'location', jsonb_build_object('confidence', 'unchecked'),
  'evidence', jsonb_build_array(jsonb_build_object('fact', 'field_existence', 'sourceUrl', 'https://example.org/a', 'summary', 's')),
  'review', jsonb_build_object('reviewedAt', '2026-10-01', 'reviewer', 'team', 'accessConfirmed', true,
    'access', 'public_free', 'identityConfirmed', true, 'locationConfidence', 'unchecked')));

-- Only admins -------------------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select throws_ok($$ select public.admin_catalog_summary() $$, 'forbidden', 'players cannot see the admin summary');
select throws_ok($$ select public.admin_catalog_listings() $$, 'forbidden', 'or the admin list');
select throws_ok(format($$ select public.admin_catalog_detail(%L) $$, tests.id('pub')), 'forbidden',
  'or a venue''s admin detail');

-- Summary ---------------------------------------------------------------------------------------------
select tests.act_as(tests.id('admin'));
select is(
  public.admin_catalog_summary() - 'stale_due',
  '{"candidates": 1, "published": 1, "verified_fields": 0, "sources_changed": 0, "open_claims": 1,
    "pending_reports": 1, "pending_media": 0}'::jsonb,
  'the summary counts what waits in each queue');

-- Lists -----------------------------------------------------------------------------------------------------
select is(
  (select jsonb_agg(x -> 'name' ->> 'ar') from jsonb_array_elements(public.admin_catalog_listings() -> 'items') x),
  '["ملعب الاختبار"]'::jsonb, 'by default the list shows candidates (the import) to review');
select is(
  (select x -> 'waiting' from jsonb_array_elements(public.admin_catalog_listings('{"state":"published"}') -> 'items') x),
  '{"claims": 1, "reports": 1, "media": 0, "sources_changed": 0}'::jsonb,
  'a published venue shows what waits on it');
select is(jsonb_array_length(public.admin_catalog_listings('{"state":"all","q":"شمس"}') -> 'items'), 1,
  'search by Arabic name');
select throws_ok($$ select public.admin_catalog_listings('{"state":"everything"}') $$, 'invalid_filter',
  'unknown states are refused');

-- Detail --------------------------------------------------------------------------------------------------------
select is(
  (select jsonb_build_object('claims', jsonb_array_length(d -> 'claims'), 'reports', jsonb_array_length(d -> 'reports'),
                             'reviews', jsonb_array_length(d -> 'reviews') >= 3,
                             'evidence', jsonb_array_length(d -> 'evidence') >= 2)
   from (select public.admin_catalog_detail(tests.id('pub')) as d) s),
  '{"claims": 1, "reports": 1, "reviews": true, "evidence": true}'::jsonb,
  'the detail has claims, reports, review history and evidence');
select is(
  (select d -> 'sources' -> 0 ->> 'key' from (select public.admin_catalog_detail(
     (select (x ->> 'facility_id')::uuid from jsonb_array_elements(public.admin_catalog_listings() -> 'items') x)) as d) s),
  'zarqa-test-field', 'an imported venue shows its source record');
select is(public.admin_catalog_detail(gen_random_uuid()), null, 'an unknown venue has no detail');

select * from finish();
rollback;
