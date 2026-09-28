// S1-9 live smoke test for account deletion: a throwaway adult uploads an avatar, downloads their
// data (an export file), asks for deletion, and — with the grace period fast-forwarded — the
// data-deletion job (run by hand with the service-role key) removes the account and its files.
// Also checks the job refuses anyone without the scheduler secret or the service key.
//
//   pnpm --filter @nujoom/tools-tester-code smoke:deletion
import { adminClient, project, testerSession } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

const admin = adminClient();
const email = `smoke-delete-${Date.now().toString(36)}@nujoom.test`;
const fn = (name, headers = {}) =>
  fetch(`${project().url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: project().anon, 'Content-Type': 'application/json', ...headers },
    body: '{}',
  });
let userId = null;
let deleted = false;

try {
  const user = await testerSession(admin, email);
  userId = user.userId;
  const { data: config } = await user.client
    .from('config')
    .select('value')
    .eq('key', 'consent_versions')
    .single();
  const { data: zarqa } = await user.client
    .from('cities')
    .select('id')
    .eq('slug', 'zarqa')
    .single();
  await user.client.rpc('complete_onboarding', {
    p_display_name: 'Delete Smoke',
    p_dob: '1990-01-01',
    p_city_id: zarqa.id,
    p_neighborhood_id: null,
    p_position: 'GK',
    p_consents: config.value,
  });
  const avatar = await user.client.storage
    .from('avatars')
    .upload(`${userId}/avatar.webp`, new Blob([new Uint8Array(64)], { type: 'image/webp' }), {
      contentType: 'image/webp',
    });
  check('the user uploads an avatar', !avatar.error, avatar.error?.message);
  const { data: session } = await user.client.auth.getSession();
  const token = session.session.access_token;
  const exported = await fn('data-export', { Authorization: `Bearer ${token}` });
  check('and downloads their data (an export file exists)', exported.ok);

  const requested = await user.client.rpc('request_account_deletion');
  check(
    'the user asks for deletion',
    requested.data?.status === 'pending',
    requested.error?.message,
  );
  const requestId = requested.data.id;

  check('the job refuses callers without a secret', (await fn('data-deletion')).status === 403);
  check(
    'or with a wrong secret',
    (await fn('data-deletion', { 'x-cron-secret': 'x'.repeat(64) })).status === 403,
  );
  check(
    'or with a user session',
    (await fn('data-deletion', { Authorization: `Bearer ${token}` })).status === 403,
  );

  const early = await (
    await fn('data-deletion', { Authorization: `Bearer ${project().service}` })
  ).json();
  const stillThere = await admin.auth.admin.getUserById(userId);
  check('nothing happens inside the grace period', !stillThere.error && early.failed === 0);

  await admin
    .from('data_requests')
    .update({ scheduled_for: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', requestId);
  const run = await fn('data-deletion', { Authorization: `Bearer ${project().service}` });
  const summary = await run.json();
  check(
    'after the grace period the job deletes the account',
    run.ok && summary.deleted >= 1,
    JSON.stringify(summary),
  );

  const gone = await admin.auth.admin.getUserById(userId);
  deleted = Boolean(gone.error);
  check('the auth user is gone', deleted);
  const { data: profile } = await admin.from('profiles').select('id').eq('id', userId);
  check('with the profile', (profile ?? []).length === 0);
  const avatars = await admin.storage.from('avatars').list(userId);
  check('the avatar file is removed', (avatars.data ?? []).length === 0);
  const exports = await admin.storage.from('exports').list(userId);
  check('the export file is removed', (exports.data ?? []).length === 0);
  const { data: record } = await admin
    .from('data_requests')
    .select('status, user_id')
    .eq('id', requestId)
    .single();
  check(
    'the request is completed and no longer points at the person',
    record?.status === 'completed' && record.user_id === null,
    JSON.stringify(record),
  );
} catch (error) {
  check('smoke run finished', false, error.message);
} finally {
  if (userId && !deleted) {
    for (const bucket of ['avatars', 'exports']) {
      const { data } = await admin.storage.from(bucket).list(userId);
      if (data?.length)
        await admin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    }
    await admin.auth.admin.deleteUser(userId);
    console.log('cleanup: removed the leftover test account');
  }
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
