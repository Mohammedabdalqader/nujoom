-- What the catalog screens need for honest states (D-075).
begin;
select plan(6);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

-- One venue in Zarqa: field A verified and taking bookings, field B listed only, field C hidden.
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'authority_verified');
insert into public.pitches (id, facility_id, label_ar, listing_state, players_per_side)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'أ', 'published', 5),
       ('00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-0000000000f1', 'ب', 'published', 5),
       ('00000000-0000-4000-8000-00000000001c', '00000000-0000-4000-8000-0000000000f1', 'ج', 'hidden', 5);
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
values ('00000000-0000-4000-8000-00000000001a', 20, 60, true, '{"sun":[["16:00","24:00"]]}');
update public.pitches set participation = 'verified', verified_at = now()
where id = '00000000-0000-4000-8000-00000000001a';
insert into public.pitch_media (facility_id, pitch_id, storage_path, rights, status, sort_order)
values ('00000000-0000-4000-8000-0000000000f1', null, '00000000-0000-4000-8000-0000000000f1/venue.jpg', 'owner_granted', 'approved', 0),
       ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1/field-a.jpg', 'owner_granted', 'approved', 1),
       ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1/pending.jpg', 'owner_granted', 'pending', 2);

select tests.act_as_anon();
select throws_ok(format($$ select public.catalog_city_counts(%s) $$, pg_temp.city('zarqa')), '42501', null,
  'signed-out visitors get no counts');
select tests.act_as(tests.id('ana'));
select is(public.catalog_city_counts(pg_temp.city('zarqa')), '{"listed": 2, "verified": 1, "bookable": 1}'::jsonb,
  'a city''s published fields, how many are verified, and how many take bookings (hidden ones never count)');
select is(public.catalog_city_counts(pg_temp.city('irbid')), '{"listed": 0, "verified": 0, "bookable": 0}'::jsonb,
  'a city with nothing reviewed yet says so');
select tests.act_as_postgres();
update public.pitch_operations set schedule_active = false where pitch_id = '00000000-0000-4000-8000-00000000001a';
select tests.act_as(tests.id('ana'));
select is(public.catalog_city_counts(pg_temp.city('zarqa')) ->> 'bookable', '0',
  'a paused schedule stays verified but no longer counts as taking bookings');

select is(
  (select jsonb_agg(p ->> 'path') from jsonb_array_elements(public.catalog_pitch('00000000-0000-4000-8000-00000000001a') -> 'photos') p),
  '["00000000-0000-4000-8000-0000000000f1/field-a.jpg", "00000000-0000-4000-8000-0000000000f1/venue.jpg"]'::jsonb,
  'the detail lists every approved photo, the field''s own first, never a pending one');
select is(
  (select jsonb_agg(p ->> 'path') from jsonb_array_elements(public.catalog_pitch('00000000-0000-4000-8000-00000000001b') -> 'photos') p),
  '["00000000-0000-4000-8000-0000000000f1/venue.jpg"]'::jsonb,
  'a sibling field shows only the venue''s photos, not another field''s');

select * from finish();
rollback;
