// S1-9 live smoke test for "download my data": a throwaway adult onboards, asks the data-export
// Edge Function for their bundle, downloads it through the signed link, asks again (same file),
// and cannot reach the private bucket directly. Every account it creates is deleted at the end.
//
//   pnpm --filter @nujoom/tools-tester-code smoke:export
import { adminClient, project, testerSession } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

const admin = adminClient();
const email = `smoke-export-${Date.now().toString(36)}@nujoom.test`;
let userId = null;

const callExport = (token) =>
  fetch(`${project().url}/functions/v1/data-export`, {
    method: 'POST',
    headers: {
      apikey: project().anon,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: '{}',
  });

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
  const onboarded = await user.client.rpc('complete_onboarding', {
    p_display_name: 'Export Smoke',
    p_dob: '1995-05-05',
    p_city_id: zarqa.id,
    p_neighborhood_id: null,
    p_position: 'DEF',
    p_consents: config.value,
  });
  check('an adult onboards', onboarded.data?.stage === 'app', onboarded.error?.message);
  const { data: session } = await user.client.auth.getSession();
  const token = session.session.access_token;

  const denied = await callExport(null);
  check('signed-out callers are refused', denied.status === 401);

  const first = await callExport(token);
  const body = await first.json();
  check(
    'the function returns a download link',
    first.ok && typeof body.url === 'string',
    JSON.stringify(body),
  );
  const expiresInDays = (Date.parse(body.expiresAt) - Date.now()) / 86_400_000;
  check(
    'the link lasts about 7 days',
    expiresInDays > 6.9 && expiresInDays < 7.1,
    String(expiresInDays),
  );

  const file = await fetch(body.url);
  const bundle = await file.json();
  check('the file downloads', file.ok);
  check('it holds the profile', bundle.profile?.display_name === 'Export Smoke');
  check('and the account email', bundle.account?.email === email);
  check('and the date of birth', bundle.date_of_birth === '1995-05-05');
  check('and every consent', Array.isArray(bundle.consents) && bundle.consents.length === 3);

  const again = await (await callExport(token)).json();
  check(
    'asking again reuses the same export',
    again.requestId === body.requestId,
    JSON.stringify(again),
  );

  const { data: requests } = await user.client.rpc('my_data_requests');
  check(
    'the user sees one ready export',
    requests?.filter((r) => r.kind === 'export').length === 1 && requests[0].status === 'ready',
  );

  const direct = await user.client.storage.from('exports').list(userId);
  check("the bucket is not readable with the user's own session", (direct.data ?? []).length === 0);
  const download = await user.client.storage
    .from('exports')
    .download(`${userId}/${body.requestId}.json`);
  check('nor downloadable without the signed link', download.error !== null);
} catch (error) {
  check('smoke run finished', false, error.message);
} finally {
  if (userId) {
    const { data: files } = await admin.storage.from('exports').list(userId);
    if (files?.length)
      await admin.storage.from('exports').remove(files.map((f) => `${userId}/${f.name}`));
    const { error } = await admin.auth.admin.deleteUser(userId);
    check('cleanup removed the account and its export', !error, error?.message);
  }
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
