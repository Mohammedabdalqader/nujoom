import { describe, expect, it } from 'vitest';

import type { GearItem } from '@/data/types';

import { addCustom, claim, gearProgress, toggleReady } from './gear';

const items: GearItem[] = [
  {
    id: 'ball',
    kind: 'ball',
    name: null,
    assignee: { id: 'me', name: 'أنا', avatarUrl: null },
    ready: true,
  },
  { id: 'water', kind: 'water', name: null, assignee: null, ready: false },
  { id: 'kit', kind: 'firstaid', name: null, assignee: null, ready: false },
];

describe('gear checklist', () => {
  it('measures readiness', () => {
    expect(gearProgress(items)).toEqual({ ready: 1, total: 3, missing: 2, percent: 33 });
    expect(gearProgress([])).toEqual({ ready: 0, total: 0, missing: 0, percent: 0 });
  });

  it('toggles and claims items', () => {
    expect(toggleReady(items, 'ball')[0]?.ready).toBe(false);
    const claimed = claim(items, 'water', { id: 'u1', name: 'عمر', avatarUrl: null, handle: 'x' });
    expect(claimed[1]).toMatchObject({ ready: true, assignee: { id: 'u1', name: 'عمر' } });
    expect(claimed[1]?.assignee).not.toHaveProperty('handle');
  });

  it('adds trimmed custom items and ignores blanks', () => {
    const added = addCustom(items, '  حامل كاميرا  ', 'g1');
    expect(added.at(-1)).toEqual({
      id: 'g1',
      kind: 'custom',
      name: 'حامل كاميرا',
      assignee: null,
      ready: false,
    });
    expect(addCustom(items, '   ', 'g2')).toHaveLength(3);
    expect(addCustom(items, 'x'.repeat(80), 'g3').at(-1)?.name).toHaveLength(40);
  });
});
