import type { Bilingual, GearItem, GearKind, GearList } from '@/data/types';

/**
 * The match gear checklist as the app sees it (D-093/D-094). The server names who brings what by
 * display name and whether it's the viewer; the screen compares ids with `me.id`, so the viewer's
 * own items carry their id and everyone else's a stable per-item placeholder (never a real id).
 */

type Raw = Record<string, unknown>;

const KINDS: readonly GearKind[] = [
  'ball',
  'bibs',
  'water',
  'referee',
  'firstaid',
  'booking',
  'custom',
];

export function toGearList(
  raw: unknown,
  { meId, pitchName }: { meId: string | null; pitchName: Bilingual | null },
): GearList {
  const r = raw as Raw;
  const items = ((r.items as Raw[] | undefined) ?? []).flatMap((i): GearItem[] => {
    const kind = KINDS.find((k) => k === i.kind);
    if (!kind) return []; // a kind this app version doesn't know is left out, not guessed
    const a = i.assignee as { name?: unknown; is_me?: unknown } | null;
    const id = String(i.id);
    return [
      {
        id,
        kind,
        name: typeof i.name === 'string' ? i.name : null,
        ready: i.ready === true,
        assignee: a
          ? {
              id: a.is_me === true && meId ? meId : `assignee-${id}`,
              name: String(a.name ?? ''),
              avatarUrl: null,
            }
          : null,
      },
    ];
  });
  return {
    bookingId: typeof r.booking_id === 'string' ? r.booking_id : null,
    pitchName,
    startsAt: typeof r.starts_at === 'string' ? r.starts_at : null,
    size: typeof r.players_per_side === 'number' ? r.players_per_side : 5,
    canEdit: r.is_organizer === true,
    items,
  };
}

/** No booking to prepare for: an honest empty checklist. */
export const EMPTY_GEAR: GearList = {
  bookingId: null,
  pitchName: null,
  startsAt: null,
  size: 5,
  canEdit: false,
  items: [],
};
