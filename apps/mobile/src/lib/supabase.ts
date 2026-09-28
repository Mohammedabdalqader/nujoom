import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { BackendConfig } from '@/data/source';
import { sessionStorage } from '@/lib/session-storage';

/**
 * The production app's Supabase client (contract §3). Created once, only by the production data
 * source; the demo build never has backend credentials. PKCE for links and Google; the session is
 * kept in the OS keystore (D-025) and refreshed while the app is in the foreground.
 */
let client: SupabaseClient | undefined;

export function createSupabase(config: BackendConfig): SupabaseClient {
  if (client) return client;
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  // Supabase's React Native guidance: refresh tokens only while the app is active.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

/** The client, if this build has a backend (production); null in the demo build. */
export function supabaseOrNull(): SupabaseClient | null {
  return client ?? null;
}
