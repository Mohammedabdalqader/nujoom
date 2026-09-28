// Developer-machine helpers for tester accounts on the linked Supabase project.
// Keys come from SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY or, when unset, from the
// logged-in Supabase CLI. They stay in memory and are never printed or written to disk.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

import { createClient } from '@supabase/supabase-js';

/** Tester accounts live on a reserved domain, so the tool can't sign into a real person's account. */
export const TESTER_DOMAIN = '@nujoom.test';

function projectRef() {
  const file = new URL('../../supabase/.temp/project-ref', import.meta.url);
  const ref = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error('No linked project: run `supabase link` in the repo root first.');
  }
  return ref;
}

function keysFromCli(ref) {
  const out = execSync(`npx supabase projects api-keys --project-ref ${ref} -o json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const keys = JSON.parse(out.slice(out.indexOf('['), out.lastIndexOf(']') + 1));
  const find = (name) => keys.find((k) => k.name === name)?.api_key ?? null;
  return { anon: find('anon'), service: find('service_role') };
}

let cached;
export function project() {
  if (cached) return cached;
  const ref = projectRef();
  let anon = process.env.SUPABASE_ANON_KEY;
  let service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anon || !service) {
    const cli = keysFromCli(ref);
    anon ||= cli.anon;
    service ||= cli.service;
  }
  if (!anon || !service) throw new Error('Could not read the project keys (run `supabase login`).');
  cached = { url: `https://${ref}.supabase.co`, anon, service };
  return cached;
}

export function assertTesterEmail(email) {
  const value = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._+-]+@nujoom\.test$/.test(value)) {
    throw new Error(`Tester emails must end with ${TESTER_DOMAIN} (got "${value}").`);
  }
  return value;
}

export function adminClient() {
  const { url, service } = project();
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function anonClient() {
  const { url, anon } = project();
  return createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Creates the tester (email confirmed) if needed and returns a fresh one-time sign-in code. */
export async function testerCode(admin, email) {
  const address = assertTesterEmail(email);
  const created = await admin.auth.admin.createUser({ email: address, email_confirm: true });
  if (created.error && !/already/i.test(created.error.message)) throw created.error;
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: address,
  });
  if (error) throw error;
  return { isNew: !created.error, code: data.properties.email_otp, userId: data.user.id };
}

/** A signed-in client for a tester, without sending any email. */
export async function testerSession(admin, email) {
  const address = assertTesterEmail(email);
  const { code, userId } = await testerCode(admin, address);
  const client = anonClient();
  const { error } = await client.auth.verifyOtp({ email: address, token: code, type: 'email' });
  if (error) throw error;
  return { client, userId };
}
