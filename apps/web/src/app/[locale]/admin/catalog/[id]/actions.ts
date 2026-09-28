'use server';

import { isLocale } from '@nujoom/i18n';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { serverSupabase } from '@/lib/supabase/server';

/**
 * Admin decisions on one venue (D-055). Every input is re-validated here, and the database checks
 * admin rights and every rule again (admin_review_listing, admin_decide_claim,
 * admin_decide_report). The outcome comes back to the page as `?done=` or `?error=`.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LISTING_ACTIONS = new Set(['publish', 'hide', 'mark_closed', 'reject']);
const CLAIM_DECISIONS = new Set(['approve', 'reject', 'request_evidence']);
const REPORT_DECISIONS = new Set(['accepted', 'rejected']);

function read(form: FormData) {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : '';
  };
  const locale = get('locale');
  const facility = get('facility');
  if (!isLocale(locale) || !UUID.test(facility)) throw new Error('invalid_request');
  return { get, locale, facility, back: `/${locale}/admin/catalog/${facility}` };
}

async function finish(
  back: string,
  error: { message?: string } | null,
  done: string,
): Promise<never> {
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message ?? 'generic')}`);
  revalidatePath(back);
  redirect(`${back}?done=${done}`);
}

async function client(back: string) {
  const supabase = await serverSupabase();
  if (!supabase) redirect(`${back}?error=unconfigured`);
  return supabase;
}

export async function reviewListing(form: FormData) {
  const { get, facility, back } = read(form);
  const target = get('target');
  const id = get('id');
  const action = get('action');
  if (!['facility', 'pitch'].includes(target) || !UUID.test(id) || !LISTING_ACTIONS.has(action)) {
    redirect(`${back}?error=invalid_action`);
  }
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_review_listing', {
    p_target: target,
    p_id: target === 'facility' ? facility : id,
    p_action: action,
    p_patch: {},
    p_reason: null,
  });
  return finish(back, error, action);
}

export async function decideClaim(form: FormData) {
  const { get, back } = read(form);
  const claim = get('claim');
  const decision = get('decision');
  if (!UUID.test(claim) || !CLAIM_DECISIONS.has(decision)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_decide_claim', {
    p_claim: claim,
    p_decision: decision,
    p_reason: null,
  });
  return finish(back, error, `claim_${decision}`);
}

export async function decideReport(form: FormData) {
  const { get, back } = read(form);
  const report = get('report');
  const decision = get('decision');
  if (!UUID.test(report) || !REPORT_DECISIONS.has(decision))
    redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_decide_report', {
    p_report: report,
    p_decision: decision,
    p_reason: null,
  });
  return finish(back, error, `report_${decision}`);
}

// --- D-056: photos, authority, the badge, outreach -------------------------------------------------
const MEDIA_DECISIONS = new Set(['approved', 'rejected']);
const CHANNELS = new Set(['phone', 'visit', 'whatsapp', 'email']);
const OUTCOMES = new Set([
  'no_answer',
  'interested',
  'declined',
  'opted_out',
  'wrong_contact',
  'agreed',
]);

export async function reviewMedia(form: FormData) {
  const { get, back } = read(form);
  const media = get('media');
  const decision = get('decision');
  if (!UUID.test(media) || !MEDIA_DECISIONS.has(decision)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_review_media', {
    p_media: media,
    p_decision: decision,
    p_reason: null,
  });
  return finish(back, error, `media_${decision}`);
}

export async function verifyAuthority(form: FormData) {
  const { facility, back } = read(form);
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_verify_authority', {
    p_facility: facility,
    p_evidence: { via: 'admin_web' },
  });
  return finish(back, error, 'authority_verified');
}

/** The badge: grant (the database requires verified authority and an active schedule) or remove. */
export async function setBadge(form: FormData) {
  const { get, back } = read(form);
  const pitch = get('pitch');
  const to = get('to');
  if (!UUID.test(pitch) || !['verified', 'not_verified'].includes(to)) {
    redirect(`${back}?error=invalid_action`);
  }
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_set_participation', {
    p_pitch: pitch,
    p_to: to,
    p_reason: to === 'verified' ? 'setup_done' : 'admin_downgrade',
    p_evidence: { via: 'admin_web' },
  });
  return finish(back, error, `badge_${to}`);
}

export async function logOutreach(form: FormData) {
  const { get, facility, back } = read(form);
  const channel = get('channel');
  const outcome = get('outcome');
  const note = get('note').trim().slice(0, 500);
  const followUp = get('follow_up');
  if (
    !CHANNELS.has(channel) ||
    !OUTCOMES.has(outcome) ||
    (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp))
  ) {
    redirect(`${back}?error=invalid_action`);
  }
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_log_outreach', {
    p_facility: facility,
    p_channel: channel,
    p_outcome: outcome,
    p_note: note || null,
    p_follow_up: followUp || null,
  });
  return finish(back, error, `outreach_${outcome}`);
}

export async function addContact(form: FormData) {
  const { get, facility, back } = read(form);
  const name = get('name').trim().slice(0, 80);
  const phone = get('phone').replace(/[\s-]/g, '');
  const email = get('email').trim().toLowerCase();
  if (!phone && !email) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('admin_add_contact', {
    p_facility: facility,
    p_name: name,
    p_phone: phone,
    p_email: email,
  });
  return finish(back, error, 'contact_added');
}
