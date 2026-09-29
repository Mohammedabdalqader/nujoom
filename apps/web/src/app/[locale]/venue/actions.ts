'use server';

import { isLocale } from '@nujoom/i18n';
import {
  DAY_KEYS,
  isValidOpeningHours,
  nextAmenities,
  parseDimension,
  parseFieldLabel,
  type OpeningHours,
} from '@nujoom/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { serverSupabase } from '@/lib/supabase/server';

import { SURFACES } from './FactsFieldset';

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
  const all = (k: string) => form.getAll(k).filter((v): v is string => typeof v === 'string');
  return { get, all, back: `/${locale}/venue` };
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
  const { get, all, back } = read(form);
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
  // Field facts (D-065): only what the owner changed; "not set" never erases a known fact.
  const facts: Record<string, unknown> = {};
  const changed = (k: string) => get(`fact_${k}`) !== '' && get(`fact_${k}`) !== get(`was_${k}`);
  if (changed('players')) {
    const n = Number(get('fact_players'));
    if (!Number.isInteger(n) || n < 3 || n > 11) redirect(`${back}?error=invalid_action`);
    facts.players_per_side = n;
  }
  if (changed('surface')) {
    if (!(SURFACES as readonly string[]).includes(get('fact_surface'))) {
      redirect(`${back}?error=invalid_action`);
    }
    facts.surface = get('fact_surface');
  }
  for (const [k, column] of [
    ['indoor', 'indoor'],
    ['lights', 'lights'],
    ['futsal', 'futsal'],
  ] as const) {
    if (!changed(k)) continue;
    if (!['yes', 'no'].includes(get(`fact_${k}`))) redirect(`${back}?error=invalid_action`);
    facts[column] = get(`fact_${k}`) === 'yes';
  }
  // Dimensions and the field's name (D-067): typed values that differ from the stored ones.
  for (const [k, column] of [
    ['length', 'length_m'],
    ['width', 'width_m'],
  ] as const) {
    const value = parseDimension(column, get(`fact_${k}`));
    if (value === 'invalid') redirect(`${back}?error=invalid_dimensions`);
    if (value !== null && value !== Number(get(`was_${k}`) || NaN)) facts[column] = value;
  }
  for (const column of ['label_ar', 'label_en'] as const) {
    const value = parseFieldLabel(get(`fact_${column}`));
    if (value === 'invalid') redirect(`${back}?error=invalid_field_name`);
    if (value !== null && value !== get(`was_${column}`)) facts[column] = value;
  }
  // Amenities (D-066): the shared rule decides whether the ticks are a change.
  const amenities = nextAmenities(
    all('amenity'),
    get('amenities_none') === 'on',
    get('was_amenities'),
  );
  if (amenities) facts.amenities = amenities;
  const supabase = await client(back);
  const { error } = await supabase.rpc('owner_confirm_field', {
    p_pitch: pitch,
    p_facts: facts,
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

// Team (D-069): owners revoke links and remove staff; staff can leave. The database checks roles.
export async function revokeLink(form: FormData) {
  const { get, back } = read(form);
  const invite = get('invite');
  if (!UUID.test(invite)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('revoke_staff_invite', { p_invite: invite });
  finish(back, error, 'link_revoked');
}

export async function removeStaffMember(form: FormData) {
  const { get, back } = read(form);
  const facility = get('facility');
  const user = get('user');
  if (!UUID.test(facility) || !UUID.test(user)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { error } = await supabase.rpc('remove_staff', { p_facility: facility, p_user: user });
  finish(back, error, 'staff_removed');
}

export async function leaveTeam(form: FormData) {
  const { get, back } = read(form);
  const facility = get('facility');
  if (!UUID.test(facility)) redirect(`${back}?error=invalid_action`);
  const supabase = await client(back);
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`${back}?error=not_authenticated`);
  const { error } = await supabase.rpc('remove_staff', {
    p_facility: facility,
    p_user: data.user.id,
  });
  finish(back, error, 'left');
}

// Joining with a staff link (D-069). The token comes in the form body; redirects only lead back
// to the join page it came from (no-referrer, no-store) or to the owner page without it.
const TOKEN = /^[0-9a-f]{64}$/;

export async function joinTeam(form: FormData) {
  const { get } = read(form);
  const locale = get('locale');
  const token = get('token');
  if (!TOKEN.test(token)) redirect(`/${locale}/venue?error=invalid_staff_invite`);
  const joinPath = `/${locale}/venue/join/${token}`;
  const supabase = await client(joinPath);
  const { error } = await supabase.rpc('accept_staff_invite', { p_token: token });
  if (error?.message === 'not_adult') redirect(`${joinPath}?profile=1`);
  if (error) redirect(`${joinPath}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/${locale}/venue`);
  redirect(`/${locale}/venue?done=joined`);
}

export async function createProfileAndJoin(form: FormData) {
  const { get } = read(form);
  const locale = get('locale');
  const token = get('token');
  if (!TOKEN.test(token)) redirect(`/${locale}/venue?error=invalid_staff_invite`);
  const joinPath = `/${locale}/venue/join/${token}`;
  const dob = get('dob');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) redirect(`${joinPath}?profile=1&error=invalid_action`);
  const supabase = await client(joinPath);
  const created = await supabase.rpc('create_owner_profile', {
    p_name: get('name'),
    p_dob: dob,
    p_accept_terms: get('accept') === 'yes',
  });
  if (created.error) {
    redirect(`${joinPath}?profile=1&error=${encodeURIComponent(created.error.message)}`);
  }
  await joinTeam(form);
}
