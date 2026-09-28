-- The venue owner's read side (D-058).
begin;
select plan(8);

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
select tests.remember('other', tests.create_user('other@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.complete_onboarding('Owner', pg_temp.years_ago(40), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());
select tests.act_as(tests.id('other'));
select public.complete_onboarding('Other', pg_temp.years_ago(35), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

-- Two published venues; the owner claims one (approved) and the other person claims the second.
select tests.act_as(tests.id('admin'));
select tests.remember('mine', public.admin_create_listing(
  jsonb_build_object('city_id', pg_temp.city('zarqa'), 'name_ar', 'ملاعب النجوم', 'access', 'public_rental'),
  '[{"label_ar":"ملعب 1","players_per_side":5}]'));
select tests.remember('theirs', public.admin_create_listing(
  jsonb_build_object('city_id', pg_temp.city('zarqa'), 'name_ar', 'ملاعب القمر', 'access', 'public_rental'),
  '[{}]'));
select public.admin_review_listing('facility', tests.id('mine'), 'publish');
select public.admin_review_listing('facility', tests.id('theirs'), 'publish');
select tests.act_as(tests.id('owner'));
select tests.remember('claim', public.claim_facility(tests.id('mine')));
select tests.act_as(tests.id('other'));
select public.claim_facility(tests.id('theirs'));
select tests.act_as(tests.id('admin'));
select public.admin_decide_claim(tests.id('claim'), 'approve');
select public.admin_add_contact(tests.id('mine'), 'Private contact', '+962791111111', null);
select public.admin_log_outreach(tests.id('mine'), 'phone', 'interested', 'internal note');

select tests.act_as_anon();
select throws_ok($$ select public.my_venues() $$, '42501', null, 'signed-out visitors have no venues');

select tests.act_as(tests.id('owner'));
select is((select jsonb_agg(v -> 'name' ->> 'ar') from jsonb_array_elements(public.my_venues()) v),
  '["ملاعب النجوم"]'::jsonb, 'the owner sees only the venue they manage');
select is(public.my_venues() -> 0 ->> 'role', 'owner', 'with their role');
select is(public.my_venues() -> 0 -> 'fields' -> 0 ->> 'players_per_side', '5', 'and its fields');
select ok(public.my_venues()::text not like '%internal note%' and public.my_venues()::text not like '%+962791111111%',
  'but never the admin''s contacts or outreach notes');
select is((select jsonb_agg(c ->> 'status') from jsonb_array_elements(public.my_claims()) c),
  '["approved"]'::jsonb, 'the owner sees their own claim and its outcome');

select tests.act_as(tests.id('other'));
select is(public.my_venues(), '[]'::jsonb, 'someone whose claim is pending manages nothing yet');
select is((select jsonb_agg(c ->> 'status') from jsonb_array_elements(public.my_claims()) c),
  '["submitted"]'::jsonb, 'and sees only their own pending claim');

select * from finish();
rollback;
