-- Countries, cities and neighborhoods: public reference data that only admins change.
begin;
select plan(6);

select tests.remember('player', tests.create_user('player@nujoom.test'));
select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));

select tests.act_as_anon();
select is(
  (select name_ar from public.cities where slug = 'amman'),
  'عمان',
  'anyone can read cities'
);
select ok(
  (select count(*) from public.neighborhoods n join public.cities c on c.id = n.city_id
   where c.slug = 'amman') >= 25,
  'Amman ships with its neighborhoods'
);
select is(
  (select currency::text from public.countries where code = 'JO'),
  'JOD',
  'Jordan is the launch country'
);

select tests.act_as(tests.id('player'));
select throws_ok(
  $$ insert into public.cities (slug, name_ar, name_en) values ('fake', 'x', 'x') $$,
  '42501', null, 'players cannot add cities'
);
update public.neighborhoods set name_en = 'Hacked' where slug = 'weibdeh';

select tests.act_as(tests.id('admin'));
select is(
  (select name_en from public.neighborhoods where slug = 'weibdeh'),
  'Weibdeh',
  'non-admin neighborhood updates are ignored'
);
select lives_ok(
  $$ insert into public.neighborhoods (city_id, slug, name_ar, name_en)
     select id, 'new-hara', 'حارة جديدة', 'New Hara' from public.cities where slug = 'zarqa' $$,
  'admins add neighborhoods'
);

select * from finish();
rollback;
