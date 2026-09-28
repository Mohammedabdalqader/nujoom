// POST /functions/v1/data-export   {}
//
// "Download my data" (S1-9, D-038/D-039, spec §7). For the signed-in user: reuses a ready export
// whose link hasn't expired, or records a new request (public.request_data_export, rate-limited),
// builds the bundle (public.export_user_data, service role), stores it in the private `exports`
// bucket, marks the request ready and returns a signed download link that expires with it.
// Older export files of the same user are removed. Nothing here is readable by other users.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, errorResponse, json } from '../_shared/http.ts';

const BUCKET = 'exports';

type Ready = { id: string; export_path: string; expires_at: string };

// An export is only handed out again while it has at least this long left; closer to its
// expiry a fresh one is built, so a link never outlives the stated expiry (Codex review).
const REUSE_MIN_SECONDS = 5 * 60;

function secondsUntil(iso: string): number {
  return Math.floor((Date.parse(iso) - Date.now()) / 1000);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('method_not_allowed', 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return errorResponse('not_authenticated', 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) return errorResponse('not_authenticated', 401);
  const userId = userData.user.id;
  const fileName = `nujoom-data-${new Date().toISOString().slice(0, 10)}.json`;

  const link = async (ready: Ready) => {
    // Exactly the remaining lifetime of the request: the link expires with it, never later.
    const lifetime = secondsUntil(ready.expires_at);
    if (lifetime < 1) throw new Error('export expired');
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(ready.export_path, lifetime, { download: fileName });
    if (error || !data) throw error ?? new Error('no signed url');
    return json({ requestId: ready.id, url: data.signedUrl, expiresAt: ready.expires_at });
  };

  // A ready export with enough life left: hand out a fresh link to the same file.
  const { data: existing } = await admin
    .from('data_requests')
    .select('id, export_path, expires_at')
    .eq('user_id', userId)
    .eq('kind', 'export')
    .eq('status', 'ready')
    .gt('expires_at', new Date(Date.now() + REUSE_MIN_SECONDS * 1000).toISOString())
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle<Ready>();
  if (existing) {
    try {
      return await link(existing);
    } catch (error) {
      console.error('data-export: link for existing export failed', (error as Error).message);
      // Fall through and build a new one.
    }
  }

  // As the user, so the database applies its idempotency and daily limit.
  const { data: requested, error: requestError } = await asUser.rpc('request_data_export');
  if (requestError) {
    return requestError.message === 'rate_limited'
      ? errorResponse('rate_limited', 429)
      : errorResponse('export_failed', 500);
  }
  const requestId = (requested as { id: string }).id;
  const path = `${userId}/${requestId}.json`;

  try {
    const { data: bundle, error: bundleError } = await admin.rpc('export_user_data', {
      p_user: userId,
    });
    if (bundleError) throw bundleError;
    const body = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, body, { contentType: 'application/json', upsert: true });
    if (uploadError) throw uploadError;
    const { data: ready, error: readyError } = await admin.rpc('mark_data_export_ready', {
      p_request: requestId,
      p_path: path,
    });
    if (readyError) throw readyError;

    // Keep only the newest bundle per user.
    const { data: files } = await admin.storage.from(BUCKET).list(userId);
    const stale = (files ?? [])
      .map((f) => `${userId}/${f.name}`)
      .filter((name) => name !== path);
    if (stale.length) await admin.storage.from(BUCKET).remove(stale);

    return await link({ id: requestId, export_path: path, expires_at: ready.expires_at });
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    console.error('data-export: failed', message);
    await admin.rpc('mark_data_request_failed', { p_request: requestId, p_error: message });
    return errorResponse('export_failed', 500);
  }
});
