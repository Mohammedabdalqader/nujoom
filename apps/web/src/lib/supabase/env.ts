/**
 * Public Supabase settings (the project URL and the anon key; never the service-role key).
 * Read lazily so static pages build without them; auth pages show a configuration error instead
 * of guessing (contract §7).
 */
export type SupabaseEnv = { url: string; anonKey: string };

export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !anonKey) return null;
  return { url, anonKey };
}
