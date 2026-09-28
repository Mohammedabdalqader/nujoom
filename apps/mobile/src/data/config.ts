import { DEFAULT_CONFIG, type AppConfig } from '@nujoom/shared';
import { useQuery } from '@tanstack/react-query';

import { getSource } from '@/data/source';

/**
 * Runtime settings from `public.config` (rating parameters, clip window, XP and stars values),
 * falling back to the shared defaults, which the settings migration seeds with the same values.
 */
export function useConfig(): AppConfig {
  const { data } = useQuery({
    queryKey: ['config'],
    queryFn: () => getSource().config(),
    staleTime: 10 * 60_000,
  });
  return data ?? DEFAULT_CONFIG;
}
