-- S1-9 data rights: export and deletion requests, the export bundle, and its coverage guard.
-- Contract §4, spec §7.
begin;
select plan(27);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('ana', tests.create_user('ana@nujoom.test'));
select tests.remember('ben', tests.create_user('ben@nujoom.test'));
select tests.remember('teen', tests.create_user('teen@nujoom.test'));

select tests.act_as(tests.id('ana'));
select public.complete_onboarding('Ana', pg_temp.years_ago(30), pg_temp.city('zarqa'), null, 'MID',
  pg_temp.consents());
insert into public.events (name, properties) values ('booking_created', '{"n":1}');
select tests.act_as(tests.id('teen'));
select public.complete_onboarding('Teen', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'FWD',
  pg_temp.consents());
select public.name_guardian('parent@nujoom.test');

-- Access ------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.data_requests', 'insert')
  and not has_table_privilege('authenticated', 'public.data_requests', 'update')
  and not has_table_privilege('authenticated', 'public.data_requests', 'delete'),
  'clients change data requests only through the RPCs'
);
select ok(
  not has_column_privilege('authenticated', 'public.data_requests', 'export_path', 'select')
  and not has_column_privilege('authenticated', 'public.data_requests', 'error', 'select'),
  'the export file path and internal errors stay server-side'
);
select ok(
  not has_function_privilege('authenticated', 'public.export_user_data(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_data_export_ready(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_data_request_failed(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.request_account_deletion()', 'execute'),
  'only the service role builds exports and records their outcome'
);

-- Export requests ------------------------------------------------------------------
select tests.act_as(tests.id('ana'));
select tests.remember('export1', (public.request_data_export() ->> 'id')::uuid);
select is(public.my_data_requests() -> 0 ->> 'status', 'pending', 'an export request starts pending');
select is((public.request_data_export() ->> 'id')::uuid, tests.id('export1'),
  'asking again while one is pending returns the same request');

select tests.act_as(tests.id('ben'));
select is(jsonb_array_length(public.my_data_requests()), 0, 'nobody else sees the request');
select is((select count(*)::integer from public.data_requests), 0, 'not even by reading the table');

select tests.act_as_service();
select is(public.mark_data_export_ready(tests.id('export1'), 'exports/ana/1.json') ->> 'status', 'ready',
  'the service marks the export ready');
select ok(
  (select expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.data_requests where id = tests.id('export1')),
  'the export link lasts 7 days');
select throws_ok(format($$ select public.mark_data_export_ready(%L, 'x') $$, tests.id('export1')),
  'request_not_pending', 'a finished request is not marked twice');

select tests.act_as(tests.id('ana'));
select tests.remember('export2', (public.request_data_export() ->> 'id')::uuid);
select tests.act_as_service();
select public.mark_data_request_failed(tests.id('export2'), 'storage unavailable');
select tests.act_as(tests.id('ana'));
select is(public.my_data_requests() -> 0 ->> 'status', 'failed', 'a failure is visible to the user');
select throws_ok($$ select public.request_data_export() $$, 'rate_limited',
  'exports are limited per day');

-- Deletion requests -----------------------------------------------------------------
select tests.remember('deletion', (public.request_account_deletion() ->> 'id')::uuid);
select ok(
  (select scheduled_for between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.data_requests where id = tests.id('deletion')),
  'deletion is scheduled after a 7-day grace period');
select is((public.request_account_deletion() ->> 'id')::uuid, tests.id('deletion'),
  'asking again keeps the original schedule');
select tests.act_as_postgres();
select is(
  (select count(*)::integer from public.audit_log
   where action = 'account.deletion_requested' and actor_id = tests.id('ana')),
  1, 'the request is audited once');
select tests.act_as(tests.id('ana'));
select is(public.cancel_account_deletion() ->> 'status', 'cancelled', 'the user can cancel within the grace');
select throws_ok($$ select public.cancel_account_deletion() $$, 'no_pending_deletion',
  'there is nothing left to cancel');
select isnt((public.request_account_deletion() ->> 'id')::uuid, tests.id('deletion'),
  'a new request after cancelling starts a new grace period');

-- The export bundle ---------------------------------------------------------------------
select tests.act_as_service();
select is(public.export_user_data(tests.id('ana')) -> 'profile' ->> 'display_name', 'Ana',
  'the bundle has the profile');
select is(public.export_user_data(tests.id('ana')) ->> 'date_of_birth', pg_temp.years_ago(30)::text,
  'and the private date of birth');
select is(jsonb_array_length(public.export_user_data(tests.id('ana')) -> 'consents'), 3,
  'and every consent record');
select is(public.export_user_data(tests.id('ana')) -> 'events' -> 0 ->> 'name', 'booking_created',
  'and their analytics events');
select is(jsonb_array_length(public.export_user_data(tests.id('ana')) -> 'data_requests'), 4,
  'and their data requests');
select is(public.export_user_data(tests.id('teen')) -> 'guardians_named' -> 0 ->> 'contact_email',
  'parent@nujoom.test', 'a youth sees the guardian they named');
select ok(
  public.export_user_data(tests.id('teen'))::text not like '%invite_token_hash%'
  and public.export_user_data(tests.id('ana'))::text not like '%ben@nujoom.test%',
  'the bundle carries no secrets and nobody else''s data');

-- Coverage guard: every table that references a user is exported or knowingly excluded.
select is_empty(
  $$ select distinct c.conrelid::regclass::text
     from pg_constraint c
     where c.contype = 'f'
       and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
       and c.connamespace = 'public'::regnamespace
       and c.conrelid::regclass::text not in (
         -- exported by public.export_user_data
         'profiles', 'profile_private', 'user_settings', 'consents', 'guardians', 'events',
         'data_requests', 'pitch_staff', 'facility_claims', 'community_submissions',
         -- excluded: admin role and the admin who last edited a setting (not personal data)
         'app_admins', 'config', 'feature_flags') $$,
  'every table with a user reference is covered by the export (extend export_user_data)'
);

-- Deleting the account keeps the de-identified record that it happened.
select tests.act_as_postgres();
delete from auth.users where id = tests.id('ana');
select is(
  (select count(*)::integer from public.data_requests where id = tests.id('deletion') and user_id is null),
  1, 'the deletion record outlives the account without pointing at it');

select * from finish();
rollback;
