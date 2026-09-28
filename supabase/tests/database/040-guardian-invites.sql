-- S1-11 guardian activation: naming, issuing, preview, approve, decline, expiry, limits.
-- Contract §6, C-011, spec §7.
begin;
select plan(41);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.hood(p_slug text) returns bigint language sql as $$
  select id from public.neighborhoods where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('youth', tests.create_user('youth@nujoom.test'));
select tests.remember('parent', tests.create_user('parent@nujoom.test'));
select tests.remember('stranger', tests.create_user('stranger@nujoom.test'));
select tests.remember('youth2', tests.create_user('youth2@nujoom.test'));
select tests.remember('mum', tests.create_user('mum@nujoom.test'));
select tests.remember('youth3', tests.create_user('youth3@nujoom.test'));
select tests.remember('teen', tests.create_user('teen@nujoom.test'));

-- Onboard: a youth who says yes to recording, an adult parent who plays, an adult stranger.
select tests.act_as(tests.id('youth'));
select public.complete_onboarding('Yazan', pg_temp.years_ago(15), pg_temp.city('amman'),
  pg_temp.hood('jabal-al-hussein'), 'MID', pg_temp.consents());
select tests.act_as(tests.id('parent'));
select public.complete_onboarding('Parent', pg_temp.years_ago(44), pg_temp.city('amman'),
  pg_temp.hood('jabal-al-hussein'), 'DEF', pg_temp.consents());
select tests.act_as(tests.id('stranger'));
select public.complete_onboarding('Stranger', pg_temp.years_ago(30), pg_temp.city('zarqa'), null,
  'FWD', pg_temp.consents());

-- Naming a guardian -----------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'public.issue_guardian_invite(uuid, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_guardian_invite_sent(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.name_guardian(text)', 'execute'),
  'only the Edge Function (service role) issues tokens and records delivery'
);
select ok(
  not has_column_privilege('authenticated', 'public.guardians', 'invite_token_hash', 'select'),
  'token hashes are not readable by clients'
);

select tests.act_as(tests.id('stranger'));
select throws_ok($$ select public.name_guardian('someone@nujoom.test') $$, 'not_youth',
  'adults do not name guardians');

select tests.act_as(tests.id('youth'));
select is(public.me() ->> 'stage', 'guardian', 'a youth without a guardian is at the guardian step');
select throws_ok($$ select public.name_guardian('not-an-email') $$, 'invalid_email', 'the email must be valid');
select throws_ok($$ select public.name_guardian(' YOUTH@nujoom.test ') $$, 'same_email',
  'a youth cannot name themselves');
select is(
  public.name_guardian('wrong@nujoom.test') -> 'guardians' -> 0 ->> 'status', 'pending',
  'naming a guardian creates a pending link');
select is(public.me() ->> 'stage', 'app', 'with a pending guardian the youth can use the app');
select is((public.me() ->> 'can_join_recorded')::boolean, false,
  'but recorded matches stay closed while the guardian is pending');
select is(
  public.name_guardian(' Parent@NUJOOM.test ') -> 'guardians' -> 0 ->> 'contact_email', 'parent@nujoom.test',
  'correcting the email replaces the pending link (normalized)');
select is(jsonb_array_length(public.my_guardians()), 1, 'only one pending link remains');
select is(public.my_guardians() -> 0 ->> 'invite_sent_at', null, 'nothing claims an email was sent yet');

-- Issuing (service role) -------------------------------------------------------------
select tests.act_as_service();
select tests.remember('link', (select id from public.guardians where youth_user_id = tests.id('youth')));
create temp table issued as
  select * from public.issue_guardian_invite(tests.id('link'), tests.id('youth'));
grant select on issued to anon, authenticated, service_role;
select is((select char_length(token) from issued), 64, 'a long random token is issued');
select is((select contact_email from issued), 'parent@nujoom.test', 'for the named address');
select is(
  (select invite_token_hash from public.guardians where id = tests.id('link')),
  (select private.token_hash(token) from issued),
  'only the hash is stored');
select throws_ok($$ select * from public.issue_guardian_invite(tests.id('link'), tests.id('youth')) $$,
  'invite_rate_limited', 'a resend waits for the cooldown');
select throws_ok($$ select * from public.issue_guardian_invite(tests.id('link'), tests.id('stranger')) $$,
  'invite_not_pending', 'a link only issues for its own youth');
select lives_ok($$ select public.mark_guardian_invite_sent(tests.id('link')) $$,
  'the function records delivery after the sender acknowledged it');
select tests.act_as(tests.id('youth'));
select isnt(public.my_guardians() -> 0 ->> 'invite_sent_at', null, 'the youth now sees when it was sent');

-- Preview and accept -----------------------------------------------------------------
select tests.act_as(tests.id('stranger'));
select is(public.guardian_invite_preview((select token from issued)), null,
  'someone else signed in sees nothing, not even that the invite exists');
select throws_ok(format($$ select public.accept_guardian_invite(%L) $$, (select token from issued)),
  'contact_mismatch', 'only the invited address can approve');

select tests.act_as(tests.id('parent'));
select is(public.guardian_invite_preview('wrong-token'), null, 'a wrong token previews nothing');
select is(public.guardian_invite_preview((select token from issued)) ->> 'youth_name', 'Yazan',
  'the invited guardian sees whose guardian they are becoming');
select is((public.guardian_invite_preview((select token from issued)) ->> 'needs_details')::boolean, false,
  'a guardian with a profile is not asked for their details again');
select throws_ok($$ select public.accept_guardian_invite('wrong-token') $$, 'invalid_invite',
  'a wrong token is refused');
select is(
  public.accept_guardian_invite((select token from issued), 'city', true) ->> 'status', 'confirmed',
  'the invited guardian approves');
select throws_ok(format($$ select public.accept_guardian_invite(%L) $$, (select token from issued)),
  'invalid_invite', 'a token works once');

select tests.act_as(tests.id('youth'));
select is(public.me() ->> 'guardian', 'confirmed', 'the youth is now guarded');
select is(public.me() ->> 'visibility', 'city', 'the guardian''s visibility choice applies');
select is((public.me() ->> 'can_join_recorded')::boolean, true,
  'the youth''s yes and the guardian''s yes open recorded matches');

-- A parent who isn't a player: a guardian-only account ---------------------------------
select tests.act_as(tests.id('youth2'));
select public.complete_onboarding('Omar', pg_temp.years_ago(14), pg_temp.city('zarqa'), null, 'GK',
  pg_temp.consents());
select public.name_guardian('mum@nujoom.test');
select tests.act_as_service();
create temp table issued2 as
  select * from public.issue_guardian_invite(
    (select id from public.guardians where youth_user_id = tests.id('youth2')), tests.id('youth2'));
grant select on issued2 to anon, authenticated, service_role;
select tests.act_as(tests.id('mum'));
select is((public.guardian_invite_preview((select token from issued2)) ->> 'needs_details')::boolean, true,
  'a guardian without a profile is asked for their name and date of birth');
select throws_ok(format($$ select public.accept_guardian_invite(%L) $$, (select token from issued2)),
  'invalid_name', 'a guardian without an account gives a name');
select throws_ok(
  format($$ select public.accept_guardian_invite(%L, 'private', null, 'Mum', %L) $$,
         (select token from issued2), pg_temp.years_ago(16)),
  'guardian_must_be_adult', 'a guardian must be an adult');
select is(
  public.accept_guardian_invite((select token from issued2), 'private', false, 'Mum', pg_temp.years_ago(41)) ->> 'status',
  'confirmed', 'an adult parent approves without becoming a player');
select is(public.me() ->> 'stage', 'onboarding', 'the guardian-only account is not a player profile');
select tests.act_as(tests.id('youth2'));
select is((public.me() ->> 'can_join_recorded')::boolean, false,
  'the guardian''s no keeps recorded matches closed');

-- Decline, expiry, send limit -----------------------------------------------------------
select tests.act_as(tests.id('youth3'));
select public.complete_onboarding('Laith', pg_temp.years_ago(16), pg_temp.city('zarqa'), null, 'FWD',
  pg_temp.consents());
select public.name_guardian('parent@nujoom.test');
select tests.act_as_service();
create temp table issued3 as
  select * from public.issue_guardian_invite(
    (select id from public.guardians where youth_user_id = tests.id('youth3')), tests.id('youth3'));
grant select on issued3 to anon, authenticated, service_role;
select tests.act_as(tests.id('parent'));
select lives_ok(format($$ select public.decline_guardian_invite(%L) $$, (select token from issued3)),
  'the invited guardian can decline');
select tests.act_as(tests.id('youth3'));
select is(public.me() ->> 'stage', 'guardian', 'after a decline the youth is back at the guardian step');

select tests.act_as(tests.id('teen'));
select public.complete_onboarding('Teen', pg_temp.years_ago(13), pg_temp.city('zarqa'), null, 'MID',
  pg_temp.consents());
select public.name_guardian('parent@nujoom.test');
select tests.act_as_service();
create temp table issued4 as
  select * from public.issue_guardian_invite(
    (select id from public.guardians where youth_user_id = tests.id('teen')), tests.id('teen'));
grant select on issued4 to anon, authenticated, service_role;
select tests.act_as_postgres();
update public.guardians set invite_expires_at = now() - interval '1 minute',
                            invite_last_sent_at = now() - interval '1 hour', invite_send_count = 5
where youth_user_id = tests.id('teen');
select tests.act_as(tests.id('parent'));
select is(public.guardian_invite_preview((select token from issued4)), null, 'an expired invite previews nothing');
select throws_ok(format($$ select public.accept_guardian_invite(%L) $$, (select token from issued4)),
  'invalid_invite', 'an expired invite cannot be accepted');
select tests.act_as_service();
select throws_ok(
  $$ select * from public.issue_guardian_invite(
       (select id from public.guardians where youth_user_id = tests.id('teen')), tests.id('teen')) $$,
  'invite_limit_reached', 'sends are capped per link');

select * from finish();
rollback;
