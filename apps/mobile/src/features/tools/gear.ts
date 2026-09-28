import type { GearItem, PlayerRef } from '@/data/types';

/** Custom item names are short labels shown to the match's players, not messages. */
export const GEAR_NAME_MAX = 40;

export function gearProgress(items: readonly GearItem[]) {
  const ready = items.filter((i) => i.ready).length;
  const total = items.length;
  return {
    ready,
    total,
    missing: total - ready,
    percent: total ? Math.round((ready / total) * 100) : 0,
  };
}

export function toggleReady(items: readonly GearItem[], id: string): GearItem[] {
  return items.map((i) => (i.id === id ? { ...i, ready: !i.ready } : i));
}

/** "أنا بجيبها": I take the item and it counts as ready. */
export function claim(items: readonly GearItem[], id: string, me: PlayerRef): GearItem[] {
  const assignee = { id: me.id, name: me.name, avatarUrl: me.avatarUrl };
  return items.map((i) => (i.id === id ? { ...i, assignee, ready: true } : i));
}

export function addCustom(items: readonly GearItem[], name: string, id: string): GearItem[] {
  const label = name.trim().slice(0, GEAR_NAME_MAX);
  if (!label) return [...items];
  return [...items, { id, kind: 'custom', name: label, assignee: null, ready: false }];
}
