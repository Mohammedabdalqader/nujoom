-- D1a catalog read side (contract §9 cases 1–5, 9–10, plus private staging from 7b).
begin;
select plan(30);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.hood(p_slug text) returns bigint language sql as $$
  select id from public.neighborhoods where slug = p_slug $$;
create function pg_temp.ids(p jsonb) returns text[] language sql as $$
  select coalesce(array_agg(x ->> 'pitch_id' order by ord), '{}')
  from jsonb_array_elements(p -> 'items') with ordinality as t(x, ord) $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('player', tests.create_user('player@nujoom.test'));

-- Fixtures (as the database; the review RPCs arrive with D1b) ---------------------------------
select tests.act_as_postgres();
-- F1 "ملاعب الرّيم": a partner facility with three fields.
insert into public.facilities (id, name_ar, city_id, neighborhood_id, lat, lng, location_confidence,
                               access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الرّيم', pg_temp.city('amman'),
        pg_temp.hood('jabal-al-hussein'), 31.9700, 35.9000, 'map_checked', 'public_rental',
        'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, label_en, players_per_side, surface, indoor,
                            lights, amenities, listing_state)
values
  ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'ملعب 1', 'Pitch 1', 5,
   'artificial_turf', false, true, '{parking,water}', 'published'),
  ('00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-0000000000f1', 'ملعب 2', 'Pitch 2', 7,
   'artificial_turf', false, true, null, 'published'),
  ('00000000-0000-4000-8000-00000000001c', '00000000-0000-4000-8000-0000000000f1', 'ملعب 3', 'Pitch 3', 5,
   'artificial_turf', true, true, '{}', 'published'),
  ('00000000-0000-4000-8000-00000000001d', '00000000-0000-4000-8000-0000000000f1', 'ملعب مغلق', null, 5,
   null, null, null, null, 'hidden');
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active) values
  ('00000000-0000-4000-8000-00000000001a', 25, 60, true),
  -- Field B: operations staged privately while not verified (contract 7b).
  ('00000000-0000-4000-8000-00000000001b', 30, 90, true),
  ('00000000-0000-4000-8000-00000000001c', 20, 60, true);
update public.pitches set participation = 'verified', verified_at = now()
where id in ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000001c');
-- Field C then pauses its schedule: still verified, not bookable.
update public.pitch_operations set schedule_active = false
where pitch_id = '00000000-0000-4000-8000-00000000001c';
insert into public.pitch_evidence (pitch_id, attribute, value, source_kind)
values ('00000000-0000-4000-8000-00000000001a', 'surface', '"artificial_turf"', 'operator');
insert into public.pitch_evidence (facility_id, attribute, value, source_kind)
values ('00000000-0000-4000-8000-0000000000f1', 'location', '{"lat":31.97,"lng":35.9}', 'osm');

-- F2: a public field known only by name; everything else unknown, location unchecked.
insert into public.facilities (id, name_ar, city_id, access, listing_state)
values ('00000000-0000-4000-8000-0000000000f2', 'ملعب الحارة الشرقية', pg_temp.city('zarqa'),
        'public_free', 'published');
insert into public.pitches (id, facility_id, listing_state)
values ('00000000-0000-4000-8000-00000000002a', '00000000-0000-4000-8000-0000000000f2', 'published');

-- F3: a school field; F4: a copy of F1; F5: a candidate.
insert into public.facilities (id, name_ar, city_id, access)
values ('00000000-0000-4000-8000-0000000000f3', 'ملعب مدرسة', pg_temp.city('amman'), 'school_only');
insert into public.facilities (id, name_ar, city_id, lat, lng, location_confidence, access, listing_state)
values ('00000000-0000-4000-8000-0000000000f4', 'ملاعب الريم (نسخة)', pg_temp.city('amman'), 31.9701,
        35.9001, 'approximate', 'public_rental', 'published'),
       ('00000000-0000-4000-8000-0000000000f5', 'ملعب مرشح', pg_temp.city('amman'), null, null,
        'unchecked', 'public_rental', 'candidate');
insert into public.pitches (id, facility_id, listing_state) values
  ('00000000-0000-4000-8000-00000000004a', '00000000-0000-4000-8000-0000000000f4', 'published'),
  ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000f5', 'published');
update public.facilities set listing_state = 'duplicate', duplicate_of = '00000000-0000-4000-8000-0000000000f1'
where id = '00000000-0000-4000-8000-0000000000f4';

-- Places ------------------------------------------------------------------------------------
select is((select count(*)::integer from public.governorates), 12, 'Jordan''s 12 governorates');
select is_empty($$ select slug from public.cities where governorate_code is null $$,
  'every city belongs to a governorate');

-- Access (case 5) ---------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.facilities', 'select')
  and not has_table_privilege('authenticated', 'public.pitches', 'select')
  and not has_table_privilege('authenticated', 'public.pitch_operations', 'select')
  and not has_table_privilege('authenticated', 'public.pitch_evidence', 'select')
  and not has_table_privilege('anon', 'public.pitches', 'select'),
  'clients never read the catalog tables directly'
);
select ok(
  not has_function_privilege('anon', 'public.search_pitches(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'private.pitch_is_bookable(uuid)', 'execute'),
  'signed-out visitors cannot search (owner Q2) and clients cannot call the gate directly'
);
select tests.act_as_anon();
select throws_ok($$ select public.search_pitches() $$, '42501', null, 'anon is refused');

-- Search (cases 1, 3, 4) -----------------------------------------------------------------------
select tests.act_as(tests.id('player'));
select is(pg_temp.ids(public.search_pitches()),
  array['00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000001c',
        '00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000002a'],
  'only published fields of published facilities appear, verified first (no hidden, candidate or duplicate)');
create temp table page as select public.search_pitches() -> 'items' as items;
grant select on page to authenticated;
select is((select x ->> 'badge' from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001a'), 'verified',
  'each field carries its own badge (F1-A verified)');
select is((select (x -> 'operations' ->> 'bookable')::boolean from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001a'), true,
  'a verified field with an active schedule is bookable');
select is((select x -> 'operations' ->> 'price_per_hour' from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001a'), '25.00',
  'and shows its operator-confirmed price');
select is((select x -> 'operations' from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001b'), 'null'::jsonb,
  'a not-verified field shows no operations, even with a privately staged schedule (7b)');
select is((select x ->> 'badge' || '|' || (x -> 'operations' ->> 'bookable')
           from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001c'), 'verified|false',
  'a paused verified field keeps its badge but is not bookable');
select is((select jsonb_build_array(x -> 'players_per_side', x -> 'surface', x -> 'indoor',
                                    x -> 'amenities', x -> 'location', x -> 'label')
           from page, jsonb_array_elements(items) x
           where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000002a'),
  '[null, null, null, null, null, null]'::jsonb,
  'unknown facts stay unknown: no defaults, and an unchecked location has no coordinates');
select is((select jsonb_build_array(a.x -> 'amenities', b.x -> 'amenities')
           from page, jsonb_array_elements(items) a(x), jsonb_array_elements(items) b(x)
           where a.x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001c'
             and b.x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001b'),
  '[[], null]'::jsonb, '"checked, none" and "unknown" stay different (4b)');

select is(pg_temp.ids(public.search_pitches('{"badge":"verified"}')),
  array['00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000001c'],
  'the verified filter');
select is(pg_temp.ids(public.search_pitches('{"badge":"not_verified"}')),
  array['00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000002a'],
  'the not-verified filter: both badges stay searchable');
select is(pg_temp.ids(public.search_pitches('{"players_per_side":[5],"indoor":false}')),
  array['00000000-0000-4000-8000-00000000001a'], 'design filters use only known facts');
select is(public.search_pitches('{"limit":2}') ->> 'next_cursor', '2', 'pages have a cursor');
select is(pg_temp.ids(public.search_pitches('{"limit":2,"cursor":2}')),
  array['00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000002a'],
  'and the next page continues');

-- The gate (case 4) ----------------------------------------------------------------------------
select tests.act_as_postgres();
select is(
  array[private.pitch_is_bookable('00000000-0000-4000-8000-00000000001a'),
        private.pitch_is_bookable('00000000-0000-4000-8000-00000000001b'),
        private.pitch_is_bookable('00000000-0000-4000-8000-00000000001c'),
        private.pitch_is_bookable('00000000-0000-4000-8000-00000000002a'),
        private.pitch_is_bookable('00000000-0000-4000-8000-00000000004a')],
  array[true, false, false, false, false],
  'only the verified, active, published field passes the booking gate');

-- Invariants (case 2, 6-7 at table level) ---------------------------------------------------------
select throws_ok($$ update public.facilities set listing_state = 'published'
                    where id = '00000000-0000-4000-8000-0000000000f3' $$,
  '23514', null, 'a school field cannot be published');
select throws_ok($$ update public.pitches set participation = 'verified', verified_at = now()
                    where id = '00000000-0000-4000-8000-00000000002a' $$,
  '23514', 'operator_not_verified', 'no badge without an operator whose authority was verified');
select throws_ok($$ insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes)
                    values ('00000000-0000-4000-8000-00000000002a', 10, 60) $$,
  '23514', 'operator_not_claimed', 'no operations for a facility nobody has claimed');
select throws_ok($$ update public.pitches set amenities = '{pool}'
                    where id = '00000000-0000-4000-8000-00000000001a' $$,
  '23514', null, 'amenities come from the closed list');

-- Arabic search (case 9) --------------------------------------------------------------------------
select tests.act_as(tests.id('player'));
select is(
  array[cardinality(pg_temp.ids(public.search_pitches('{"q":"الريم"}'))),
        cardinality(pg_temp.ids(public.search_pitches('{"q":"ريم"}'))),
        cardinality(pg_temp.ids(public.search_pitches('{"q":"رِيم"}'))),
        cardinality(pg_temp.ids(public.search_pitches('{"q":"reem"}')))],
  array[3, 3, 3, 0],
  '"الريم", "ريم" and "رِيم" find the RIM fields despite the shadda; "reem" needs an English name');

-- Near me and the map (case 10) ----------------------------------------------------------------------
select is(pg_temp.ids(public.search_pitches('{"near":{"lat":31.975,"lng":35.905,"km":5}}')),
  array['00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000001c',
        '00000000-0000-4000-8000-00000000001b'],
  'near me finds located fields within the radius (unchecked locations stay out)');
select ok((public.search_pitches('{"near":{"lat":31.975,"lng":35.905,"km":5}}') -> 'items' -> 0
           ->> 'distance_km')::numeric between 0.5 and 1.0, 'with their distance');
select is(cardinality(pg_temp.ids(public.search_pitches('{"bbox":{"s":32.4,"w":35.8,"n":32.6,"e":36.0}}'))),
  0, 'a map view elsewhere shows nothing from Amman');

-- Detail ---------------------------------------------------------------------------------------------------
select is(
  (select jsonb_agg(s ->> 'badge' order by s ->> 'pitch_id')
   from jsonb_array_elements(public.catalog_pitch('00000000-0000-4000-8000-00000000001a') -> 'siblings') s),
  '["not_verified", "verified"]'::jsonb,
  'the detail lists the facility''s other searchable fields with their own badges');
select is(public.catalog_pitch('00000000-0000-4000-8000-00000000001a') ->> 'attribution',
  '© OpenStreetMap contributors', 'OSM-sourced facts carry the attribution');
select is(public.catalog_pitch('00000000-0000-4000-8000-00000000004a'), null,
  'a duplicate listing has no detail');

select * from finish();
rollback;
