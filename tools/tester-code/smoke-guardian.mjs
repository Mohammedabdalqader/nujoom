// S1-11 real-data smoke test against the linked project: a throwaway youth names a guardian and
// asks the guardian-invite Edge Function to email them; the approval then runs through a token
// issued by the service role (as the guardian-link tool does), and the youth's state is checked.
// Every account it creates is deleted at the end.
//
//   pnpm --filter @nujoom/tools-tester-code smoke:guardian
import { adminClient, project, testerSession } from './lib.mjs';

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
const youthEmail = `smoke-youth-${stamp}@nujoom.test`;
const guardianEmail = `smoke-guardian-${stamp}@nujoom.test`;
const created = [];

try {
  const youth = await testerSession(admin, youthEmail);
  created.push(youth.userId);
  const { data: config } = await youth.client
    .from('config')
    .select('value')
    .eq('key', 'consent_versions')
    .single();
  const { data: zarqa } = await youth.client
    .from('cities')
    .select('id')
    .eq('slug', 'zarqa')
    .single();
  let r = await youth.client.rpc('complete_onboarding', {
    p_display_name: 'Smoke Youth',
    p_dob: yearsAgo(15),
    p_city_id: zarqa.id,
    p_neighborhood_id: null,
    p_position: 'MID',
    p_consents: config.value,
  });
  check('a youth lands on the guardian step', r.data?.stage === 'guardian', r.error?.message);

  r = await youth.client.rpc('name_guardian', { p_email: guardianEmail });
  const linkId = r.data?.link_id;
  check('naming a guardian creates a pending link', Boolean(linkId), r.error?.message);

  // The Edge Function: without a configured email sender it must say so, never claim "sent".
  const { data: session } = await youth.client.auth.getSession();
  const res = await fetch(`${project().url}/functions/v1/guardian-invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      apikey: project().anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ linkId, locale: 'ar' }),
  });
  const body = await res.json().catch(() => ({}));
  const sentAt = (await youth.client.rpc('my_guardians')).data?.[0]?.invite_sent_at ?? null;
  check(
    `the function answers honestly (${res.status} ${body.error ?? (body.sent ? 'sent' : '?')})`,
    (res.ok && body.sent === true && sentAt !== null) ||
      (body.error === 'email_failed' && sentAt === null),
  );

  const denied = await fetch(`${project().url}/functions/v1/guardian-invite`, {
    method: 'POST',
    headers: { apikey: project().anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkId, locale: 'ar' }),
  });
  check('the function refuses callers without a session', denied.status === 401);

  // Approve with a service-issued token, as the guardian-link tool does.
  await admin.from('guardians').update({ invite_last_sent_at: null }).eq('id', linkId);
  const { data: issued, error: issueError } = await admin
    .rpc('issue_guardian_invite', { p_link_id: linkId, p_youth: youth.userId })
    .single();
  check('the service role issues a token', Boolean(issued?.token), issueError?.message);

  const guardian = await testerSession(admin, guardianEmail);
  created.push(guardian.userId);
  r = await guardian.client.rpc('guardian_invite_preview', { p_token: issued.token });
  check(
    'the invited guardian sees the youth',
    r.data?.youth_name === 'Smoke Youth',
    r.error?.message,
  );
  r = await guardian.client.rpc('accept_guardian_invite', {
    p_token: issued.token,
    p_visibility: 'private',
    p_recording: true,
    p_guardian_name: 'Smoke Guardian',
    p_guardian_dob: yearsAgo(40),
  });
  check('a non-player guardian approves', r.data?.status === 'confirmed', r.error?.message);

  r = await youth.client.rpc('me');
  check(
    'the youth is guarded and in the app',
    r.data?.guardian === 'confirmed' && r.data?.stage === 'app',
  );
  check('recorded matches open with both yeses', r.data?.can_join_recorded === true);
} catch (error) {
  check('smoke run finished', false, error.message);
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    check(`cleanup removed ${id.slice(0, 8)}…`, !error, error?.message);
  }
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
