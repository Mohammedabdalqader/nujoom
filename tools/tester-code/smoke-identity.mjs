// Slice-1 real-data smoke test against the linked Supabase project (contract §8.3).
// Creates two throwaway @nujoom.test accounts (adult and youth), runs the identity flow through
// the public API with the anon key + a real session, checks the denied paths, then deletes both
// accounts. Nothing it creates survives the run.
//
//   pnpm --filter @nujoom/tools-tester-code smoke
import { adminClient, anonClient, testerSession } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};
const yearsAgo = (n) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const admin = adminClient();
const stamp = Date.now().toString(36);
const created = [];

try {
  // Adult --------------------------------------------------------------------------
  const adult = await testerSession(admin, `smoke-adult-${stamp}@nujoom.test`);
  created.push(adult.userId);
  const db = adult.client;

  let r = await db.rpc('me');
  check('a new account starts at onboarding', r.data?.stage === 'onboarding', r.error?.message);

  const { data: config } = await db
    .from('config')
    .select('value')
    .eq('key', 'consent_versions')
    .single();
  const versions = config?.value;
  check('signed-in clients read the consent versions', typeof versions?.terms === 'string');

  const { data: amman } = await db.from('cities').select('id').eq('slug', 'amman').single();
  const { data: hood } = await db
    .from('neighborhoods')
    .select('id')
    .eq('slug', 'jabal-al-hussein')
    .single();

  r = await db.rpc('complete_onboarding', {
    p_display_name: 'Smoke Adult',
    p_dob: yearsAgo(25),
    p_city_id: amman.id,
    p_neighborhood_id: null,
    p_position: 'FWD',
    p_consents: { terms: versions.terms, privacy: versions.privacy },
  });
  check(
    'a missing neighbourhood is refused with its code',
    r.error?.message === 'invalid_neighborhood',
    r.error?.message,
  );

  r = await db.rpc('complete_onboarding', {
    p_display_name: 'Smoke Adult',
    p_dob: yearsAgo(25),
    p_city_id: amman.id,
    p_neighborhood_id: hood.id,
    p_position: 'FWD',
    p_consents: { terms: versions.terms, privacy: versions.privacy, recording: false },
  });
  check(
    'onboarding with recording declined lands in the app',
    r.data?.stage === 'app',
    r.error?.message,
  );
  check('declined recording closes recorded matches', r.data?.can_join_recorded === false);
  check(
    'a long random card code is issued',
    /^NJM-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(r.data?.card_code ?? ''),
  );

  r = await db.rpc('record_consent', {
    p_type: 'recording',
    p_version: versions.recording,
    p_granted: true,
  });
  check(
    'saying yes later opens recorded matches',
    r.data?.can_join_recorded === true,
    r.error?.message,
  );

  r = await db.from('profiles').insert({ id: adult.userId, display_name: 'Hack' });
  check('direct profile writes are refused', Boolean(r.error), 'insert succeeded');

  r = await db.from('profiles').select('card_code').eq('id', adult.userId);
  check('card codes are not readable from the table', Boolean(r.error), 'card_code readable');

  r = await db.from('profile_private').select('dob').eq('user_id', adult.userId).single();
  check('the owner reads their own birth date', typeof r.data?.dob === 'string', r.error?.message);

  r = await db.rpc('update_profile', { p_patch: { shirt_number: 100 } });
  check(
    'invalid edits return a stable code',
    r.error?.message === 'invalid_shirt_number',
    r.error?.message,
  );

  r = await db.rpc('set_settings', { p_patch: { share_presence: true } });
  check('adults can share presence', r.data?.settings?.share_presence === true, r.error?.message);

  r = await anonClient().from('profiles').select('id').eq('id', adult.userId);
  check(
    'anon cannot see a city-visible profile',
    !r.error && r.data.length === 0,
    r.error?.message,
  );

  r = await anonClient().rpc('me');
  check('anon cannot call me()', Boolean(r.error));

  // Youth --------------------------------------------------------------------------
  const youth = await testerSession(admin, `smoke-youth-${stamp}@nujoom.test`);
  created.push(youth.userId);
  r = await youth.client.rpc('complete_onboarding', {
    p_display_name: 'Smoke Youth',
    p_dob: yearsAgo(15),
    p_city_id: amman.id,
    p_neighborhood_id: hood.id,
    p_position: 'MID',
    p_consents: { terms: versions.terms, privacy: versions.privacy, recording: versions.recording },
    p_visibility: 'public',
  });
  check('a youth is sent to the guardian step', r.data?.stage === 'guardian', r.error?.message);
  check('a youth stays private whatever they ask for', r.data?.visibility === 'private');
  check('a youth cannot join recorded matches yet', r.data?.can_join_recorded === false);

  r = await youth.client.rpc('set_settings', { p_patch: { share_presence: true } });
  check(
    'youth presence is never shared',
    r.error?.message === 'youth_presence_hidden',
    r.error?.message,
  );

  r = await db.from('profiles').select('id').eq('id', youth.userId);
  check('another player cannot see the youth', !r.error && r.data.length === 0, r.error?.message);

  r = await db.rpc('player_profile', { p_user: youth.userId });
  check('a hidden player returns nothing', !r.error && r.data === null, r.error?.message);
} catch (error) {
  check('smoke run finished', false, error.message);
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    check(`cleanup removed ${id.slice(0, 8)}…`, !error, error?.message);
  }
  if (created.length) {
    const { data } = await admin.from('profiles').select('id').in('id', created);
    check('deleting the account cascades to the profile', (data ?? []).length === 0);
  }
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
