import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAGS, type FeatureFlag } from '@nujoom/shared';
import { useQuery } from '@tanstack/react-query';

import { getSource } from '@/data/source';

/**
 * Feature flags (spec §6.12). Readable by anyone; falls back to the shared defaults, so a flag
 * that fails to load is treated as its safe default (payments off, tournaments hidden).
 */
export function useFlags(): Record<FeatureFlag, boolean> {
  const { data } = useQuery({
    queryKey: ['feature_flags'],
    queryFn: () => getSource().flags(),
    staleTime: 5 * 60_000,
  });
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of FEATURE_FLAGS) {
    const value = data?.[key];
    if (typeof value === 'boolean') flags[key] = value;
  }
  return flags;
}
