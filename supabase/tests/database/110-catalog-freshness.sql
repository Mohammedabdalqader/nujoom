-- Catalog freshness (D-050; contract §3.1, test 4a).
begin;
select plan(13);

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

-- Six verified fields of one partner venue, in different states of freshness.
select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental',
        'published', 'authority_verified');
insert into public.pitch_staff (facility_id, user_id) values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'));
insert into public.pitches (id, facility_id, label_ar, listing_state)
select ('00000000-0000-4000-8000-0000000000' || n)::uuid, '00000000-0000-4000-8000-0000000000f1',
       'ملعب ' || n, 'published'
from unnest(array['a1', 'b1', 'c1', 'd1', 'e1', 'f1']) n;
insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active)
select id, 20, 60, true from public.pitches where facility_id = '00000000-0000-4000-8000-0000000000f1';
update public.pitches set participation = 'verified', verified_at = now()
where facility_id = '00000000-0000-4000-8000-0000000000f1'
  and id <> '00000000-0000-4000-8000-0000000000f1'; -- f1 stays not verified
-- a1 fresh; b1 paused 35 days (warning); c1 paused 50 days (due); d1 facts 95 days (warning);
-- e1 facts 110 days (due).
update public.pitch_operations set schedule_active = false
where pitch_id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1');
update public.pitch_operations set paused_at = now() - interval '35 days'
where pitch_id = '00000000-0000-4000-8000-0000000000b1';
update public.pitch_operations set paused_at = now() - interval '50 days'
where pitch_id = '00000000-0000-4000-8000-0000000000c1';
update public.pitch_operations set confirmed_at = now() - interval '95 days'
where pitch_id = '00000000-0000-4000-8000-0000000000d1';
update public.pitch_operations set confirmed_at = now() - interval '110 days'
where pitch_id = '00000000-0000-4000-8000-0000000000e1';

-- Pause tracking --------------------------------------------------------------------------------
select isnt((select paused_at from public.pitch_operations where pitch_id = '00000000-0000-4000-8000-0000000000b1'),
  null, 'pausing a schedule records when');
update public.pitch_operations set schedule_active = true where pitch_id = '00000000-0000-4000-8000-0000000000a1';
select is((select paused_at from public.pitch_operations where pitch_id = '00000000-0000-4000-8000-0000000000a1'),
  null, 'an active schedule has no pause date');

-- Access --------------------------------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.run_catalog_freshness()', 'execute'),
  'only the schedule (service role) runs the downgrade');
select tests.act_as(tests.id('owner'));
select throws_ok($$ select public.admin_stale_listings() $$, 'forbidden', 'only admins see the stale list');

-- The admin's warning list ------------------------------------------------------------------------------
select tests.act_as(tests.id('admin'));
select is(
  (select jsonb_agg(x ->> 'reason' || ':' || (x ->> 'due') order by x ->> 'pitch_id')
   from jsonb_array_elements(public.admin_stale_listings()) x),
  '["paused:false", "paused:true", "facts_old:false", "facts_old:true"]'::jsonb,
  'paused over 30 days or facts over 90 days are listed; beyond the 14-day grace they are due');

-- The daily job --------------------------------------------------------------------------------------------
select tests.act_as_service();
select is(public.run_catalog_freshness(), 2, 'the job removes the badge from the two due fields');
select is(public.run_catalog_freshness(), 0, 'and is idempotent');
select tests.act_as_postgres();
select is(
  (select jsonb_agg(p.id::text || '=' || p.participation order by p.id) from public.pitches p
   where p.facility_id = '00000000-0000-4000-8000-0000000000f1'),
  '["00000000-0000-4000-8000-0000000000a1=verified", "00000000-0000-4000-8000-0000000000b1=verified",
    "00000000-0000-4000-8000-0000000000c1=not_verified", "00000000-0000-4000-8000-0000000000d1=verified",
    "00000000-0000-4000-8000-0000000000e1=not_verified", "00000000-0000-4000-8000-0000000000f1=not_verified"]'::jsonb,
  'fresh and warning-only fields keep their badge');
select is(
  (select jsonb_agg(reason || '/' || coalesce(recorded_by::text, 'system') order by pitch_id)
   from public.verification_events where pitch_id in ('00000000-0000-4000-8000-0000000000c1',
                                                      '00000000-0000-4000-8000-0000000000e1')),
  '["stale_paused/system", "stale_facts/system"]'::jsonb,
  'each downgrade is recorded with its reason, by the system');
select is(
  (select count(*)::integer from public.audit_log where action = 'catalog.participation_not_verified'),
  2, 'and audited');

-- Operators clear warnings by acting ----------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select public.owner_set_schedule_active('00000000-0000-4000-8000-0000000000b1', true);
select public.owner_confirm_field('00000000-0000-4000-8000-0000000000d1', '{}',
                                  '{"price_per_hour":22,"slot_minutes":60}');
select tests.act_as(tests.id('admin'));
select is(public.admin_stale_listings(), '[]'::jsonb,
  'resuming the schedule and re-confirming the facts clear the warnings');

-- The public side follows ---------------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select is(
  (select x -> 'operations' from jsonb_array_elements(public.search_pitches('{"limit":50}') -> 'items') x
   where x ->> 'pitch_id' = '00000000-0000-4000-8000-0000000000c1'),
  'null'::jsonb, 'a downgraded field shows no operations');
select is(
  (select (x -> 'operations' ->> 'bookable')::boolean
   from jsonb_array_elements(public.search_pitches('{"limit":50}') -> 'items') x
   where x ->> 'pitch_id' = '00000000-0000-4000-8000-0000000000b1'),
  true, 'a resumed field is bookable again');

select * from finish();
rollback;
