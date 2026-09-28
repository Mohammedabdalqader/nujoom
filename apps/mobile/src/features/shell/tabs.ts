import type { IconName } from '@/ui/Icon';

/** The five tabs, in the design's order (right to left in Arabic). */
export const TABS = [
  { name: 'index', key: 'home', icon: 'home' },
  { name: 'pitches', key: 'pitches', icon: 'stadium' },
  { name: 'match', key: 'match', icon: 'sports_soccer' },
  { name: 'rankings', key: 'rankings', icon: 'leaderboard' },
  { name: 'profile', key: 'profile', icon: 'military_tech' },
] as const satisfies readonly { name: string; key: string; icon: IconName }[];

export type TabKey = (typeof TABS)[number]['key'];

export function tabForRoute(routeName: string | undefined): TabKey {
  return TABS.find((t) => t.name === routeName)?.key ?? 'home';
}
