import { describe, expect, it } from 'vitest';

import { areaPath, monotonePath, niceTicks, roundedTopBar } from './paths';

describe('chart paths', () => {
  it('draws a smooth curve through every point', () => {
    const d = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 5 },
      { x: 20, y: 8 },
    ]);
    expect(d.startsWith('M0,10')).toBe(true);
    expect(d).toContain('10,5');
    expect(d.endsWith('20,8')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it('handles tiny inputs', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 3, y: 4 }])).toBe('M3,4');
  });

  it('closes the area down to the baseline', () => {
    expect(
      areaPath(
        [
          { x: 0, y: 1 },
          { x: 5, y: 2 },
        ],
        10,
      ),
    ).toMatch(/L5,10 L0,10 Z$/);
  });

  it('rounds only the top of bars and skips empty ones', () => {
    expect(roundedTopBar(0, 0, 10, 20, 6)).toContain('Q');
    expect(roundedTopBar(0, 0, 10, 0, 6)).toBe('');
  });

  it('picks nice ticks', () => {
    expect(niceTicks(0, 14)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(950, 3040)).toEqual([0, 1000, 2000, 3000, 4000]);
  });
});
