'use server';

import { isLocale } from '@nujoom/i18n';
import { DAY_KEYS, isValidOpeningHours, type OpeningHours } from '@nujoom/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { serverSupabase } from '@/lib/supabase/server';

/**
 * The venue owner's actions (D-060). Inputs are re-validated here; the database decides who may
 * do what (claim_facility for adults, owner_* for the venue's staff only).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function read(form: FormData) {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const locale = get('locale');
  if (!isLocale(locale)) throw new Error('invalid_request');
  return { get, back: `/${locale}/venue` };
}

async function client(back: string) {
  const supabase = await serverSupabase();
  if (!supabase) redirect(`${back}?error=unconfigured`);
  return supabase;
}

function finish(back: string, error: { message?: string } | null, done: string): never {
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message ?? 'generic')}`);
  revalidatePath(back);
  redirect(`${back}?done=${done}`);
}

export async function claimVenue(form: FormData) {
  const { get, back } = read(form);
  const facility = get('facility');
  if (!UUID.test(facility)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('claim_facility', { p_facility: facility });
  // No adult profile yet (a web-only owner): ask for it, then claim.
  if (error?.message === 'not_adult') redirect(`${back}?profile_for=${facility}`);
  finish(back, error, 'claimed');
}

export async function createProfileAndClaim(form: FormData) {
  const { get, back } = read(form);
  const facility = get('facility');
  const dob = get('dob');
  if (!UUID.test(facility) || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    redirect(`${back}?profile_for=${facility}&error=invalid_action`);
  }
  const supabase = await client(back);
  const created = await supabase.rpc('create_owner_profile', {
    p_name: get('name'),
    p_dob: dob,
    p_accept_terms: get('accept') === 'yes',
  });
  if (created.error) {
    redirect(`${back}?profile_for=${facility}&error=${encodeURIComponent(created.error.message)}`);
  }
  const { error } = await supabase.rpc('claim_facility', { p_facility: facility });
  finish(back, error, 'claimed');
}

export async function confirmField(form: FormData) {
  const { get, back } = read(form);
  const pitch = get('pitch');
  const price = Number(get('price').replace(',', '.'));
  const slot = Number(get('slot'));
  if (
    !UUID.test(pitch) ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 1000 ||
    ![60, 90].includes(slot)
  ) {
    redirect(`${back}?error=invalid_action`);
  }
  // The weekly hours (D-064): a ticked day has one period and optionally a second one.
  const hours: OpeningHours = {};
  for (const day of DAY_KEYS) {
    if (get(`open_${day}`) !== 'on') continue;
    const ranges: [string, string][] = [[get(`s1_${day}`), get(`e1_${day}`)]];
    if (get(`s2_${day}`) && get(`e2_${day}`)) ranges.push([get(`s2_${day}`), get(`e2_${day}`)]);
    hours[day] = ranges;
  }
  if (!isValidOpeningHours(hours)) redirect(`${back}?error=invalid_opening_hours`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('owner_confirm_field', {
    p_pitch: pitch,
    p_facts: {},
    p_operations: {
      price_per_hour: price,
      slot_minutes: slot,
      price_note_ar: get('note_ar').slice(0, 120) || null,
      price_note_en: get('note_en').slice(0, 120) || null,
      opening_hours: hours,
    },
  });
  finish(back, error, 'saved');
}

export async function setSchedule(form: FormData) {
  const { get, back } = read(form);
  const pitch = get('pitch');
  const active = get('active');
  if (!UUID.test(pitch) || !['on', 'off'].includes(active))
    redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('owner_set_schedule_active', {
    p_pitch: pitch,
    p_active: active === 'on',
  });
  finish(back, error, `schedule_${active}`);
}
