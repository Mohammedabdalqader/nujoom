import type { Friend } from '@/data/types';

/** Presence pip colours (the prototype's green / amber / grey). */
export const PRESENCE_DOT = {
  online: 'bg-secondary',
  in_match: 'bg-primary-container',
  offline: 'bg-outline',
} as const;

export type PresenceFilter = 'all' | 'online' | 'in_match';

export function presenceCounts(friends: readonly Friend[]) {
  return {
    all: friends.length,
    online: friends.filter((f) => f.presence === 'online').length,
    in_match: friends.filter((f) => f.presence === 'in_match').length,
  };
}

/** The squad list: presence filter plus a search over name, handle, card code and hara (both languages). */
export function filterFriends(
  friends: readonly Friend[],
  filter: PresenceFilter,
  query: string,
): Friend[] {
  const q = query.trim().toLowerCase();
  return friends.filter((f) => {
    if (filter !== 'all' && f.presence !== filter) return false;
    if (!q) return true;
    return [f.name, f.handle ?? '', f.cardCode, f.neighborhood.ar, f.neighborhood.en].some((v) =>
      v.toLowerCase().includes(q),
    );
  });
}
