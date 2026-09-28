// POST /functions/v1/data-deletion   (called hourly by pg_cron through pg_net; D-040)
//
// Carries out account deletions whose 7-day grace has ended and removes expired export files
// (S1-9, spec §7). Not callable by users: JWT verification is off for this function, and the
// call must carry `x-cron-secret` (a random value only the database vault holds) or the
// service-role key.
//
// For each due request: prepare (revokes the guardian links the person holds) → remove their
// storage files (avatars, exports) → delete the auth user (profile, settings, consents and
// guardian links cascade) → finish (request completed, audited). A failure leaves the request
// pending for the next run and is logged.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { errorResponse, json } from '../_shared/http.ts';

const USER_BUCKETS = ['avatars', 'exports'];

async function removeFolder(admin: SupabaseClient, bucket: string, folder: string) {
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  if (error) throw error;
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length) {
    const { error: removeError } = await admin.storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
  }
  return paths.length;
}

/**
 * Whether a key carries service-role rights: it must be able to run a service-only function.
 * (Key formats differ between the CLI and the function environment, so no string comparison.)
 */
async function isServiceKey(url: string, key: string): Promise<boolean> {
  if (key.length < 20) return false;
  const probe = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await probe.rpc('due_account_deletions', { p_limit: 1 });
  return !error;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return errorResponse('method_not_allowed', 405);
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // The scheduler proves itself with the vault secret; an operator (or the smoke test) may run
  // the job by hand with the service-role key.
  const bearer = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const operator = await isServiceKey(Deno.env.get('SUPABASE_URL')!, bearer);
  const secret = request.headers.get('x-cron-secret') ?? '';
  const { data: scheduled } = secret
    ? await admin.rpc('check_data_rights_secret', { p_secret: secret })
    : { data: false };
  if (!operator && scheduled !== true) return errorResponse('forbidden', 403);

  const deleted: string[] = [];
  const failed: string[] = [];
  const { data: due, error: dueError } = await admin.rpc('due_account_deletions', { p_limit: 20 });
  if (dueError) return errorResponse('deletion_failed', 500);

  for (const { request_id: requestId } of (due ?? []) as { request_id: string }[]) {
    try {
      const { data: userId, error: prepError } = await admin.rpc('prepare_account_deletion', {
        p_request: requestId,
      });
      if (prepError) throw prepError;
      for (const bucket of USER_BUCKETS) await removeFolder(admin, bucket, userId as string);
      const { error: userError } = await admin.auth.admin.deleteUser(userId as string);
      if (userError) throw userError;
      const { error: finishError } = await admin.rpc('finish_account_deletion', {
        p_request: requestId,
      });
      if (finishError) throw finishError;
      deleted.push(requestId);
    } catch (error) {
      console.error('data-deletion: request', requestId, (error as Error).message);
      failed.push(requestId);
    }
  }

  // Export files whose 7-day link has expired.
  let expiredFiles = 0;
  const { data: expired, error: expireError } = await admin.rpc('expire_data_exports', {
    p_limit: 200,
  });
  if (expireError) console.error('data-deletion: expire exports', expireError.message);
  const paths = ((expired ?? []) as string[]).filter(Boolean);
  if (paths.length) {
    const { error } = await admin.storage.from('exports').remove(paths);
    if (error) console.error('data-deletion: remove expired exports', error.message);
    else expiredFiles = paths.length;
  }

  return json({ deleted: deleted.length, failed: failed.length, expiredFiles });
});
