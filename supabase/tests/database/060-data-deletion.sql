-- S1-9 data rights: carrying out due deletions and expiring export files (D-040).
begin;
select plan(22);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('parent', tests.create_user('parent@nujoom.test'));
select tests.remember('teen', tests.create_user('teen@nujoom.test'));
select tests.remember('sam', tests.create_user('sam@nujoom.test'));

select tests.act_as(tests.id('parent'));
select public.complete_onboarding('Parent', pg_temp.years_ago(42), pg_temp.city('zarqa'), null, 'DEF',
  pg_temp.consents());
insert into public.events (name) values ('booking_created');
select tests.act_as(tests.id('teen'));
select public.complete_onboarding('Teen', pg_temp.years_ago(15), pg_temp.city('zarqa'), null, 'MID',
  pg_temp.consents());
select public.name_guardian('parent@nujoom.test');
select tests.act_as_service();
create temp table issued as
  select * from public.issue_guardian_invite(
    (select id from public.guardians where youth_user_id = tests.id('teen')), tests.id('teen'));
grant select on issued to anon, authenticated, service_role;
select tests.act_as(tests.id('parent'));
select public.accept_guardian_invite((select token from issued), 'private', true);
select tests.act_as(tests.id('sam'));
select public.complete_onboarding('Sam', pg_temp.years_ago(25), pg_temp.city('zarqa'), null, 'FWD',
  pg_temp.consents());

-- Access -------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'public.due_account_deletions(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.prepare_account_deletion(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.finish_account_deletion(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.expire_data_exports(integer)', 'execute')
  and not has_function_privilege('anon', 'public.check_data_rights_secret(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.check_data_rights_secret(text)', 'execute'),
  'only the service role carries out deletions'
);

-- Due requests -------------------------------------------------------------------------
select tests.act_as(tests.id('parent'));
select tests.remember('req', (public.request_account_deletion() ->> 'id')::uuid);
select tests.act_as_service();
select is_empty($$ select * from public.due_account_deletions() $$,
  'a request inside its grace period is not due');
select throws_ok(format($$ select public.prepare_account_deletion(%L) $$, tests.id('req')),
  'request_not_due', 'and cannot be prepared');

select tests.act_as_postgres();
update public.data_requests set scheduled_for = now() - interval '1 minute' where id = tests.id('req');
select tests.act_as_service();
select results_eq(
  $$ select request_id, user_id from public.due_account_deletions() $$,
  format($$ values (%L::uuid, %L::uuid) $$, tests.id('req'), tests.id('parent')),
  'after the grace period it is due');

-- Why prepare exists: a confirmed guardian can't simply vanish from the link.
select tests.act_as_postgres();
select throws_ok(format($$ delete from auth.users where id = %L $$, tests.id('parent')),
  '23514', null, 'deleting a confirmed guardian without preparing breaks the link invariant');

select tests.act_as_service();
select is(public.prepare_account_deletion(tests.id('req')), tests.id('parent'),
  'prepare returns the account to delete');
select is((select status::text from public.guardians where youth_user_id = tests.id('teen')), 'revoked',
  'the links they guard are revoked');
select tests.act_as(tests.id('teen'));
select is(public.me() ->> 'stage', 'guardian', 'their youth is back at the guardian step');
select is((public.me() ->> 'can_join_recorded')::boolean, false, 'with recorded matches closed');

select tests.act_as_service();
select throws_ok(format($$ select public.finish_account_deletion(%L) $$, tests.id('req')),
  'account_still_present', 'a request is only finished once the account is gone');

-- The Edge Function deletes the auth user (here: as the database would).
select tests.act_as_postgres();
delete from auth.users where id = tests.id('parent');
select tests.act_as_service();
select lives_ok(format($$ select public.finish_account_deletion(%L) $$, tests.id('req')),
  'then the request is finished');
select is((select status::text from public.data_requests where id = tests.id('req')), 'completed',
  'as completed');
select tests.act_as_postgres();
select is((select count(*)::integer from public.profiles where id = tests.id('parent')), 0,
  'the profile is gone');
select is((select count(*)::integer from public.consents where user_id = tests.id('parent')), 0,
  'with every consent');
select is((select count(*)::integer from public.events where name = 'booking_created' and user_id is null), 1,
  'analytics events stay only without the person');
select is(
  (select count(*)::integer from public.audit_log
   where action in ('account.deletion_started', 'account.deleted')),
  2, 'both steps are audited');
select is(
  (select count(*)::integer from public.consents
   where user_id = tests.id('teen') and type = 'recording' and given_by is null),
  1, 'the youth keeps the consent record the guardian gave, without pointing at them');
select throws_ok(
  format($$ update public.consents set granted = not granted where user_id = %L $$, tests.id('teen')),
  '42501', null, 'consents otherwise stay append-only');

-- Expired export files ----------------------------------------------------------------------
select tests.act_as(tests.id('sam'));
select tests.remember('export', (public.request_data_export() ->> 'id')::uuid);
select tests.act_as_service();
select public.mark_data_export_ready(tests.id('export'), 'sam/export.json');
select is_empty($$ select * from public.expire_data_exports() $$, 'a live export is kept');
select tests.act_as_postgres();
update public.data_requests set expires_at = now() - interval '1 minute' where id = tests.id('export');
select tests.act_as_service();
select results_eq($$ select * from public.expire_data_exports() $$, $$ values ('sam/export.json') $$,
  'an expired export is handed over for removal');
select is((select status::text || '|' || coalesce(export_path, '-') from public.data_requests
           where id = tests.id('export')), 'completed|-', 'and its request closed');

-- The scheduler secret ----------------------------------------------------------------------
select is(public.check_data_rights_secret(repeat('x', 64)), false,
  'an unknown secret is refused (and everything is refused where there is no vault)');

select * from finish();
rollback;
