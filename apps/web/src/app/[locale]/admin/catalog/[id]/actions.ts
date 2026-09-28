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
