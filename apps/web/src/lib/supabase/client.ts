'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseEnv } from './env';

let client: SupabaseClient | null = null;

/** The browser client (PKCE, session in cookies shared with the server); null if unconfigured. */
export function browserSupabase(): SupabaseClient | null {
  const env = supabaseEnv();
  if (!env) return null;
  client ??= createBrowserClient(env.url, env.anonKey);
  return client;
}
