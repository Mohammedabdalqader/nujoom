-- Config, feature flags, audit log, analytics events and the job queue.
begin;
select plan(22);

select tests.remember('player', tests.create_user('player@nujoom.test'));
select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));

-- Feature flags and config
select tests.act_as_anon();
select is(
  (select enabled from public.feature_flags where key = 'payments_enabled'),
  false,
  'anyone can read flags; payments are off for the pilot'
);
select throws_ok($$ select * from public.config $$, '42501', null, 'anon cannot read config');

select tests.act_as(tests.id('player'));
select is(
  (select (value ->> 'k_factor')::int from public.config where key = 'rating'),
  24,
  'signed-in users can read config'
);
update public.config set value = '{"window_hours": 1}' where key = 'voting';
update public.feature_flags set enabled = true where key = 'payments_enabled';
select is(
  (select count(*) from public.audit_log),
  0::bigint,
  'non-admins cannot read the audit log'
);
select throws_ok(
  $$ insert into public.feature_flags (key, enabled) values ('sneaky', true) $$,
  '42501', null, 'nobody creates flags from a client'
);

select tests.act_as(tests.id('admin'));
select is(
  (select value from public.config where key = 'voting'),
  '{"window_hours": 24}'::jsonb,
  'non-admin config updates are ignored'
);
update public.config set value = '{"window_hours": 48}' where key = 'voting';
select results_eq(
  $$ select value, updated_by from public.config where key = 'voting' $$,
  $$ values ('{"window_hours": 48}'::jsonb, tests.id('admin')) $$,
  'admins can update config and are stamped as the editor'
);
select results_eq(
  $$ select action, target_id, actor_id from public.audit_log where target_type = 'config' $$,
  $$ values ('config.update', 'voting', tests.id('admin')) $$,
  'config changes are written to the audit log'
);
select is(
  (select enabled from public.feature_flags where key = 'payments_enabled'),
  false,
  'non-admin flag updates were ignored'
);

select tests.act_as_postgres();
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', 'audit_log is append-only', 'the audit log cannot be deleted'
);

-- Analytics events
select tests.act_as(tests.id('player'));
select lives_ok(
  $$ insert into public.events (name, properties) values ('booking_created', '{"pitch": 1}') $$,
  'users log their own events'
);
select throws_ok(
  $$ insert into public.events (user_id, name) values (tests.id('admin'), 'vote_cast') $$,
  '42501', null, 'users cannot log events as someone else'
);
select throws_ok(
  $$ insert into public.events (name) values ('Bad Name!') $$,
  '23514', null, 'event names are validated'
);
select is((select count(*) from public.events), 0::bigint, 'users cannot read analytics');
select tests.act_as(tests.id('admin'));
select results_eq(
  $$ select name, user_id from public.events $$,
  $$ values ('booking_created', tests.id('player')) $$,
  'admins read events, attributed to the session user'
);

-- Job queue, as the worker (service role)
select tests.act_as_service();
select tests.remember('job', private.enqueue_job('clip.process', '{"clip_id": "c1"}', 'clip:c1'));
select is(
  private.enqueue_job('clip.process', '{"clip_id": "c1"}', 'clip:c1'),
  tests.id('job'),
  'enqueue is idempotent per key'
);
select results_eq(
  $$ select id, attempts, status::text from private.claim_job('worker-1', array['clip.process']) $$,
  $$ values (tests.id('job'), 1, 'running') $$,
  'a worker claims the job'
);
select is_empty(
  $$ select * from private.claim_job('worker-2') $$,
  'a running job is not handed to a second worker'
);
select is(
  private.fail_job(tests.id('job'), 'worker-1', 'ffmpeg exited 1')::text,
  'queued',
  'a failed job is re-queued'
);
select ok(
  (select run_after > now() from public.jobs where id = tests.id('job')),
  'the retry is delayed (backoff)'
);
update public.jobs set run_after = now() - interval '1 second' where id = tests.id('job');
select tests.remember('claimed', (select id from private.claim_job('worker-2')));
select ok(private.complete_job(tests.id('job'), 'worker-2'), 'the retrying worker completes the job');
update public.jobs set status = 'running', attempts = max_attempts, locked_by = 'w', locked_at = now()
  where id = tests.id('job');
select is(
  private.fail_job(tests.id('job'), 'w', 'still broken')::text,
  'dead',
  'jobs out of attempts are marked dead'
);

select * from finish();
rollback;
