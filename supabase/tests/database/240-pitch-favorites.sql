-- Favourite pitches (D-086).
begin;
select plan(13);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('bob', tests.create_user('bob@nujoom.test'));
select tests.remember('new', tests.create_user('new@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());
select tests.act_as(tests.id('bob'));
select public.complete_onboarding('Bob', pg_temp.years_ago(22), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());

-- A published venue with a verified field (a) and a listed, not-verified field (b).
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000003f1', 'ملاعب المفضلة', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000031a', '00000000-0000-4000-8000-0000000003f1', 'ملعب 1', 'published', 5),
       ('00000000-0000-4000-8000-00000000031b', '00000000-0000-4000-8000-0000000003f1', 'ملعب 2', 'published', 5);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000031a', 20, 60, true,
        (select jsonb_object_agg(d, '[["16:00","24:00"]]'::jsonb) from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000031a';

select ok(not has_table_privilege('authenticated', 'public.pitch_favorites', 'select')
          and not has_table_privilege('anon', 'public.pitch_favorites', 'select'),
  'clients never read favourites directly');

select tests.act_as_anon();
select throws_ok($$ select public.set_pitch_favorite('00000000-0000-4000-8000-00000000031a', true) $$,
  '42501', null, 'a visitor has no favourites');
select tests.act_as(tests.id('new'));
select throws_ok($$ select public.set_pitch_favorite('00000000-0000-4000-8000-00000000031a', true) $$,
  'not_onboarded', 'a player must finish onboarding first');

select tests.act_as(tests.id('ana'));
select throws_ok($$ select public.set_pitch_favorite('00000000-0000-4000-8000-00000000031b', true) $$,
  'pitch_unavailable', 'only verified fields can be favourites (spec §5)');
select is(public.set_pitch_favorite('00000000-0000-4000-8000-00000000031a', true), true,
  'a verified field becomes a favourite');
select is(public.set_pitch_favorite('00000000-0000-4000-8000-00000000031a', true), true,
  'setting it again changes nothing (a double tap can''t flip it back)');
select ok(jsonb_array_length(public.my_favorite_pitches()) = 1
          and public.my_favorite_pitches() -> 0 ->> 'pitch_id' = '00000000-0000-4000-8000-00000000031a'
          and public.my_favorite_pitches() -> 0 ->> 'badge' = 'verified'
          and public.my_favorite_pitches() -> 0 -> 'facility_name' ->> 'ar' = 'ملاعب المفضلة',
  'the list shows it like a search result');

select tests.act_as(tests.id('bob'));
select is(public.my_favorite_pitches(), '[]'::jsonb, 'nobody else sees someone''s favourites');

select tests.act_as_postgres();
select is(public.export_user_data(tests.id('ana')) -> 'favorite_pitches' -> 0 ->> 'venue', 'ملاعب المفضلة',
  'favourites are in the data export');

-- A field that loses its badge stays in the list, shown as it is now.
update public.pitches set participation = 'not_verified', verified_at = null
where id = '00000000-0000-4000-8000-00000000031a';
select tests.act_as(tests.id('ana'));
select is(public.my_favorite_pitches() -> 0 ->> 'badge', 'not_verified',
  'a favourite that loses its badge shows as not verified');
-- One that leaves the catalog drops out of the list.
select tests.act_as_postgres();
update public.facilities set listing_state = 'hidden' where id = '00000000-0000-4000-8000-0000000003f1';
select tests.act_as(tests.id('ana'));
select is(public.my_favorite_pitches(), '[]'::jsonb, 'a venue taken out of the catalog drops out');

select is(public.set_pitch_favorite('00000000-0000-4000-8000-00000000031a', false), false,
  'removing always works');
select tests.act_as_postgres();
select is((select count(*)::int from public.pitch_favorites where user_id = tests.id('ana')), 0,
  'and it''s gone');

select * from finish();
rollback;
