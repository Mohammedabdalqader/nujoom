// POST /functions/v1/guardian-invite   { linkId: "<uuid>", locale: "ar" | "en" }
//
// Called by a signed-in youth after naming a guardian (public.name_guardian), S1-11 / C-011.
// Checks the link is theirs and still pending (as the youth, through RLS), has the database issue
// a one-time token (service role), emails the guardian an approval link through Supabase Auth,
// and only then records the invite as sent. The plain token never reaches the youth's device.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase);
//      APPROVAL_URL: where the email link lands, e.g. https://<web domain>/{locale}/guardian/accept
//      (the web app, S1-8). Until it is set, the app's own link is used.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, errorResponse, json } from '../_shared/http.ts';

type Locale = 'ar' | 'en';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KNOWN_SQL = ['invite_not_pending', 'invite_rate_limited', 'invite_limit_reached'];

function sqlErrorCode(error: { message?: string } | null): string {
  return KNOWN_SQL.find((code) => error?.message === code) ?? 'invite_failed';
}

function approvalLink(locale: Locale, token: string): string {
  const base = Deno.env.get('APPROVAL_URL');
  if (base) return `${base.replace('{locale}', locale).replace(/\/$/, '')}?token=${token}`;
  return `nujoom://guardian/accept?token=${token}`;
}

/**
 * Emails the approval link through Supabase Auth (the project's SMTP sender): an invitation for a
 * new address, a sign-in link for an existing account. Either way the guardian lands on the
 * approval page signed in as the invited address, which the database checks before approving.
 */
async function sendApprovalEmail(
  admin: SupabaseClient,
  email: string,
  youthName: string,
  redirectTo: string,
): Promise<void> {
  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { guardian_for: youthName },
  });
  if (!invite.error) return;
  if (!/already|registered|exists/i.test(invite.error.message)) throw invite.error;
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });
  if (error) throw error;
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
  const youthId = userData.user.id;

  let body: { linkId?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_body', 400);
  }
  const linkId = typeof body.linkId === 'string' && UUID.test(body.linkId) ? body.linkId : null;
  const locale: Locale = body.locale === 'en' ? 'en' : 'ar';
  if (!linkId) return errorResponse('invalid_body', 400);

  // As the youth: RLS only returns their own links.
  const { data: link } = await asUser
    .from('guardians')
    .select('id, status, youth_user_id')
    .eq('id', linkId)
    .maybeSingle();
  if (!link || link.youth_user_id !== youthId) return errorResponse('invite_not_pending', 404);
  if (link.status !== 'pending') return errorResponse('invite_not_pending', 409);

  const { data: issued, error: issueError } = await admin
    .rpc('issue_guardian_invite', { p_link_id: linkId, p_youth: youthId })
    .single<{ token: string; contact_email: string; expires_at: string; youth_name: string }>();
  if (issueError || !issued) return errorResponse(sqlErrorCode(issueError), 429);

  try {
    await sendApprovalEmail(
      admin,
      issued.contact_email,
      issued.youth_name,
      approvalLink(locale, issued.token),
    );
  } catch (error) {
    // Nothing is marked sent; the youth sees that the email didn't go out and can retry.
    console.error('guardian-invite: email not sent', (error as Error).message);
    return errorResponse('email_failed', 502);
  }

  const { error: markError } = await admin.rpc('mark_guardian_invite_sent', { p_link_id: linkId });
  if (markError) console.error('guardian-invite: could not record delivery', markError.message);

  return json({ linkId, expiresAt: issued.expires_at, sent: true });
});
