-- D2 part 1: importing reviewed catalog records (D-051; contract test 8).
begin;
select plan(17);

create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
-- A reviewed record in the handoff format (intake pitch + review).
create function pg_temp.record(p_patch jsonb default '{}', p_review jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object(
    'id', 'amman-hussein-parks-eleven-a-side',
    'publication', 'unpublished', 'participation', 'not_verified', 'operations', null,
    'facilityNameAr', 'حدائق الحسين', 'facilityNameEn', 'Al Hussein Public Parks',
    'fieldLabelAr', 'ملعب 11 لاعباً', 'fieldLabelEn', '11-a-side field',
    'city', 'Amman', 'areaAr', null, 'playersPerSide', 11, 'surface', null,
    'indoor', null, 'lights', null, 'access', 'paid_reservation_request',
    'location', jsonb_build_object('confidence', 'unchecked', 'addressAr', null, 'lat', null, 'lng', null),
    'evidence', jsonb_build_array(
      jsonb_build_object('fact', 'field_existence', 'sourceUrl', 'https://www.amman.jo/x.pdf', 'summary', 'Municipal card'),
      jsonb_build_object('fact', 'players_per_side', 'sourceUrl', 'https://www.amman.jo/x.pdf', 'summary', 'Named field 11')),
    'photoLeads', jsonb_build_array(jsonb_build_object('sourceUrl', 'https://www.amman.jo/p.pdf',
      'exactFieldConfirmed', false, 'reusePermission', 'unknown')),
    'review', jsonb_build_object('reviewedAt', '2026-10-01', 'reviewer', 'field-team',
      'accessConfirmed', true, 'access', 'public_rental', 'identityConfirmed', true,
      'locationConfidence', 'map_checked', 'lat', 31.9800, 'lng', 35.8800) || p_review
  ) || p_patch $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('player', tests.create_user('player@nujoom.test'));
select tests.act_as(tests.id('player'));
select public.complete_onboarding('Player', pg_temp.years_ago(20),
  (select id from public.cities where slug = 'zarqa'), null, 'MID', pg_temp.consents());

-- Access ------------------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'public.import_catalog_record(uuid, text, jsonb)', 'execute')
  and not has_table_privilege('authenticated', 'public.source_records', 'select'),
  'only the import tool (service role) imports; clients never read source records');

select tests.act_as_service();
select tests.remember('run', public.import_start_run('nujoom_research', 'amman-2026-10-01'));

-- The intake can't claim what review, operators and admins decide ---------------------------------
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"publication":"published"}')) ->> 'reason', 'claims_not_allowed',
  'a record claiming publication is refused');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"participation":"verified"}')) ->> 'reason', 'claims_not_allowed',
  'a record claiming the badge is refused');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"operations":{"price":20}}')) ->> 'reason', 'claims_not_allowed',
  'a record claiming operations is refused');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{}', '{"accessConfirmed":false}')) ->> 'reason', 'not_reviewed',
  'a record whose access is not confirmed is refused');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{}', '{"identityConfirmed":null}')) ->> 'reason', 'not_reviewed',
  'so is one whose field identity is not confirmed');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"city":"Atlantis"}')) ->> 'reason', 'unknown_city', 'unknown cities are refused');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"surface":"lava"}')) ->> 'reason', 'invalid_value', 'and invalid values');

-- A reviewed record becomes a candidate -----------------------------------------------------------
select is(public.import_catalog_record(tests.id('run'), 'research-notes', pg_temp.record()) ->> 'status',
  'created', 'a reviewed record is imported');
select tests.act_as_postgres();
select is(
  (select jsonb_build_object('state', f.listing_state, 'access', f.access, 'confidence', f.location_confidence,
                             'name', f.name_ar, 'city', c.slug, 'pitch_state', p.listing_state,
                             'size', p.players_per_side, 'surface', p.surface, 'badge', p.participation)
   from public.facilities f join public.cities c on c.id = f.city_id
   join public.pitches p on p.facility_id = f.id where f.name_ar = 'حدائق الحسين'),
  '{"state": "candidate", "access": "public_rental", "confidence": "map_checked", "name": "حدائق الحسين",
    "city": "amman", "pitch_state": "candidate", "size": 11, "surface": null, "badge": "not_verified"}'::jsonb,
  'as an unpublished candidate: reviewed facts set, unknowns null, no badge');
select is(
  (select count(*)::integer from public.pitch_evidence e join public.source_records s on s.id = e.source_record_id
   where s.source_key = 'amman-hussein-parks-eleven-a-side'),
  2, 'each cited fact is evidence pointing at its source record');
select is((select count(*)::integer from public.pitch_media), 0, 'photo leads are never imported');

select tests.act_as(tests.id('player'));
select is(jsonb_array_length(public.search_pitches() -> 'items'), 0,
  'nothing imported is searchable before an admin publishes it');

-- Idempotency (test 8) ----------------------------------------------------------------------------------
select tests.act_as_service();
select is(public.import_catalog_record(tests.id('run'), 'research-notes', pg_temp.record()) ->> 'status',
  'unchanged', 're-importing the same record changes nothing');
select is(public.import_catalog_record(tests.id('run'), 'research-notes',
  pg_temp.record('{"lights":true}')) ->> 'status', 'changed',
  'a new version of an imported record is flagged');
select tests.act_as_postgres();
select is(
  (select jsonb_build_object('facilities', (select count(*) from public.facilities),
                             'sources', (select count(*) from public.source_records),
                             'needs_review', (select needs_review from public.source_records),
                             'lights', (select lights from public.pitches)))
  , '{"facilities": 1, "sources": 1, "needs_review": true, "lights": null}'::jsonb,
  'without duplicating the listing or overwriting the reviewed catalog');

select tests.act_as_service();
select is(public.import_finish_run(tests.id('run')),
  '{"seen": 1, "new": 1, "needs_review": 1, "gone": 0}'::jsonb,
  'the run closes with its counts (a partial batch marks nothing gone)');

select * from finish();
rollback;
