import { describe, expect, it } from 'vitest';

import type { Friend } from '@/data/types';

import { filterFriends, presenceCounts } from './logic';

function friend(overrides: Partial<Friend>): Friend {
  return {
    id: 'f',
    name: 'لاعب',
    handle: null,
    avatarUrl: null,
    position: 'MID',
    form: 8,
    presence: 'offline',
    inMatchAt: null,
    neighborhood: { ar: 'جبل الحسين', en: 'Jabal al-Hussein' },
    cardCode: 'NJM-0001',
    lastActiveAt: null,
    ...overrides,
  };
}

const squad = [
  friend({ id: '1', name: 'عمر الدوسري', presence: 'online', cardCode: 'NJM-2901' }),
  friend({
    id: '2',
    name: 'طارق الزعبي',
    presence: 'online',
    neighborhood: { ar: 'اللويبدة', en: 'Weibdeh' },
  }),
  friend({ id: '3', name: 'سيف العبدلي', presence: 'in_match' }),
  friend({ id: '4', name: 'حمزة الكيلاني', handle: 'hamza_k' }),
];

describe('friends list', () => {
  it('counts presence', () => {
    expect(presenceCounts(squad)).toEqual({ all: 4, online: 2, in_match: 1 });
  });

  it('filters by presence', () => {
    expect(filterFriends(squad, 'online', '').map((f) => f.id)).toEqual(['1', '2']);
    expect(filterFriends(squad, 'in_match', '').map((f) => f.id)).toEqual(['3']);
    expect(filterFriends(squad, 'all', '')).toHaveLength(4);
  });

  it('searches name, handle, card code and hara in both languages', () => {
    expect(filterFriends(squad, 'all', 'الزعبي').map((f) => f.id)).toEqual(['2']);
    expect(filterFriends(squad, 'all', 'njm-2901').map((f) => f.id)).toEqual(['1']);
    expect(filterFriends(squad, 'all', 'weib').map((f) => f.id)).toEqual(['2']);
    expect(filterFriends(squad, 'all', 'HAMZA').map((f) => f.id)).toEqual(['4']);
    expect(filterFriends(squad, 'online', 'سيف')).toEqual([]);
  });
});
