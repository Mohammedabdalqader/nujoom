-- Opening hours: validated shape, kept across price saves, required to switch on (D-063).
begin;
select plan(15);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.hours() returns jsonb language sql as $$
  select opening_hours from public.pitch_operations where pitch_id = '00000000-0000-4000-8000-00000000001a' $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.create_owner_profile('Abu Sami', '1980-05-05', true);
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'claimed');
insert into public.pitches (id, facility_id, listing_state)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'published');
insert into public.pitch_staff (facility_id, user_id) values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'));

-- The shape ------------------------------------------------------------------------------------------
select is(
  array[private.valid_opening_hours('{}'),
        private.valid_opening_hours('{"sun":[["16:00","24:00"]]}'),
        private.valid_opening_hours('{"fri":[["10:00","13:00"],["15:00","23:30"]],"sat":[]}')],
  array[true, true, true], 'empty, a full evening, and a split day are valid');
select is(
  array[private.valid_opening_hours('[]'),
        private.valid_opening_hours('{"funday":[["10:00","12:00"]]}'),
        private.valid_opening_hours('{"sun":[["18:00","16:00"]]}'),
        private.valid_opening_hours('{"sun":[["24:00","24:00"]]}'),
        private.valid_opening_hours('{"sun":[["9:00","12:00"]]}'),
        private.valid_opening_hours('{"sun":[["10:00","13:00"],["12:00","14:00"]]}'),
        private.valid_opening_hours('{"sun":[["15:00","18:00"],["10:00","12:00"]]}'),
        private.valid_opening_hours('{"sun":[["10:00"]]}'),
        private.valid_opening_hours('{"sun":"10:00-12:00"}')],
  array[false, false, false, false, false, false, false, false, false],
  'not an object, unknown days, backwards, bad times, overlaps, out of order and wrong shapes are refused');
select throws_ok($$ insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, opening_hours)
                    values ('00000000-0000-4000-8000-00000000001a', 20, 60, '{"sun":[["18:00","16:00"]]}') $$,
  '23514', null, 'the table itself refuses a bad shape');

-- Owners -------------------------------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select throws_ok($$ select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
                      '{"price_per_hour":20,"slot_minutes":60,"opening_hours":{"sun":[["18:00","16:00"]]}}') $$,
  'invalid_opening_hours', 'owners get a clear error for bad hours');
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
  '{"price_per_hour":20,"slot_minutes":60}');
select throws_ok($$ select public.owner_set_schedule_active('00000000-0000-4000-8000-00000000001a', true) $$,
  'no_opening_hours', 'a schedule without hours cannot be switched on');
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
  '{"price_per_hour":20,"slot_minutes":60,"opening_hours":{"sun":[["16:00","24:00"]],"fri":[["14:00","23:00"]]}}');
select tests.act_as_postgres();
select is(pg_temp.hours(), '{"sun":[["16:00","24:00"]],"fri":[["14:00","23:00"]]}'::jsonb, 'hours are saved');
select tests.act_as(tests.id('owner'));
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
  '{"price_per_hour":25,"slot_minutes":90}');
select tests.act_as_postgres();
select is(pg_temp.hours(), '{"sun":[["16:00","24:00"]],"fri":[["14:00","23:00"]]}'::jsonb,
  'a later price change keeps them');
select tests.act_as(tests.id('owner'));
select is(public.my_venues() -> 0 -> 'fields' -> 0 -> 'operations' -> 'opening_hours',
  '{"sun":[["16:00","24:00"]],"fri":[["14:00","23:00"]]}'::jsonb, 'the owner page reads them back (D-064)');
select is(public.my_venues() -> 0 -> 'fields' -> 0 -> 'amenities', 'null'::jsonb,
  'amenities read back as unknown until someone checks them (D-066)');
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{"amenities":["parking","water"]}');
select is(public.my_venues() -> 0 -> 'fields' -> 0 -> 'amenities', '["parking", "water"]'::jsonb,
  'and as the owner''s list once confirmed');
select lives_ok($$ select public.owner_set_schedule_active('00000000-0000-4000-8000-00000000001a', true) $$,
  'with hours the schedule switches on');
select public.owner_confirm_field('00000000-0000-4000-8000-00000000001a', '{}',
  '{"price_per_hour":25,"slot_minutes":90,"opening_hours":{}}');
select tests.act_as_postgres();
select is(pg_temp.hours(), '{}'::jsonb, 'hours can be cleared on purpose');
select tests.act_as(tests.id('owner'));
select lives_ok($$ select public.owner_set_schedule_active('00000000-0000-4000-8000-00000000001a', false) $$,
  'pausing never needs hours');
select throws_ok($$ select public.owner_set_schedule_active('00000000-0000-4000-8000-00000000001a', true) $$,
  'no_opening_hours', 'and switching back on needs them again');
select tests.act_as_postgres();
select is(private.has_opening_hours('{"sun":[],"mon":[]}'), false, 'days with no ranges count as closed');

select * from finish();
rollback;
