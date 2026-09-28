import { redirect } from 'next/navigation';

import type { Locale } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

/**
 * The admin pages' gate (server side). Signed out → sign-in and back; signed in but not an admin
 * → null (the page shows "admins only"). Admin rights are decided by the database, which refuses
 * every admin RPC for anyone not in app_admins; this only chooses what to render.
 */
export async function adminSession(locale: Locale, path: string) {
  const supabase = await serverSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(path)}`);
  const { data: summary, error } = await supabase.rpc('admin_catalog_summary');
  if (error) return null;
  return { supabase, summary: summary as Record<string, number> };
}
