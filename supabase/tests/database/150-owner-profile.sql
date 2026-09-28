-- A basic adult profile for web-only venue owners (D-059).
begin;
select plan(9);

create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));
select tests.remember('web', tests.create_user('web-owner@nujoom.test'));
select tests.remember('kid', tests.create_user('kid@nujoom.test'));

select tests.act_as(tests.id('admin'));
select tests.remember('venue', public.admin_create_listing(
  jsonb_build_object('city_id', (select id from public.cities where slug = 'zarqa'),
                     'name_ar', 'ملاعب الفجر', 'access', 'public_rental'), '[{}]'));
select public.admin_review_listing('facility', tests.id('venue'), 'publish');

-- Without a profile a web-only visitor can't claim.
select tests.act_as(tests.id('web'));
select throws_ok(format($$ select public.claim_facility(%L) $$, tests.id('venue')), 'not_adult',
  'a visitor without a profile cannot claim a venue');
select throws_ok($$ select public.create_owner_profile('Abu Sami', '1980-05-05', false) $$,
  'consent_required', 'the terms and privacy policy must be accepted');
select throws_ok(format($$ select public.create_owner_profile('Abu Sami', %L, true) $$, pg_temp.years_ago(16)),
  'not_adult', 'venue owners must be adults');
select is(public.create_owner_profile('  Abu   Sami ', '1980-05-05', true) ->> 'created', 'true',
  'an adult owner gets a basic profile');
select tests.act_as_postgres();
select is(
  (select jsonb_build_object('name', p.display_name, 'youth', p.is_youth, 'city', p.city_id, 'onboarded', p.onboarded_at)
   from public.profiles p where p.id = tests.id('web')),
  '{"name": "Abu Sami", "youth": false, "city": null, "onboarded": null}'::jsonb,
  'an adult, not a player: no city, not onboarded');
select is(
  (select jsonb_agg(type::text order by type) from public.consents where user_id = tests.id('web')),
  '["terms", "privacy"]'::jsonb, 'the terms and privacy acceptance is recorded, and nothing else');
select tests.act_as(tests.id('web'));
select is(public.create_owner_profile('Someone Else', '1970-01-01', true) ->> 'created', 'false',
  'an existing profile is never overwritten');
select lives_ok(format($$ select public.claim_facility(%L) $$, tests.id('venue')),
  'now they can claim the venue');
select is(public.me() ->> 'stage', 'onboarding', 'and the app still treats them as not yet a player');

select * from finish();
rollback;
