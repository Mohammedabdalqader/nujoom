import { DEFAULT_CONFIG, type AppConfig } from '@nujoom/shared';
import { useQuery } from '@tanstack/react-query';

/**
 * Runtime settings from `public.config` (rating parameters, clip window, XP and stars values).
 * Until R1 connects the app to Supabase these are the shared defaults, which the settings
 * migration seeds with the same values.
 */
export function useConfig(): AppConfig {
  const { data } = useQuery({
    queryKey: ['config'],
    queryFn: async () => DEFAULT_CONFIG,
    staleTime: 10 * 60_000,
  });
  return data ?? DEFAULT_CONFIG;
}
