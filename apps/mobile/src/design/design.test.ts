import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { GLYPHS } from '@/design/icons/glyphs';
import { containsArabic, resolveTextClasses } from '@/design/text-classes';
import { colorOf, fixed, palette, themeVariables } from '@/design/tokens';

const css = fs.readFileSync(new URL('../../global.css', import.meta.url), 'utf8');
const cssTokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+): ([^;]+);/g)].map(([, name, value]) => [name, value]),
);

describe('design tokens', () => {
  it('global.css defines every theme token with its dark value', () => {
    for (const [name, value] of Object.entries(palette.dark)) {
      expect(cssTokens[name], name).toBe(value);
    }
  });

  it('global.css defines every fixed colour', () => {
    for (const [name, value] of Object.entries(fixed)) {
      expect(cssTokens[name], name).toBe(value);
    }
  });

  it('light and dark themes define the same tokens', () => {
    expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort());
  });

  it('builds CSS variables for the light theme', () => {
    expect(themeVariables('light')['--color-surface']).toBe('#f8fafc');
  });

  it('resolves fixed and theme colours', () => {
    expect(colorOf('light', 'primary-container')).toBe('#f59e0b');
    expect(colorOf('light', 'primary')).toBe('#b45309');
  });
});

describe('text classes', () => {
  it('turns weight classes into a font weight', () => {
    const r = resolveTextClasses('text-[18px] font-black text-primary', { arabic: false });
    expect(r.weight).toBe(900);
    expect(r.className).toBe('text-[18px] text-primary');
  });

  it('drops letter-spacing on Arabic text', () => {
    const r = resolveTextClasses('tracking-wider uppercase', {
      variant: 'label-tag',
      arabic: true,
    });
    expect(r.className).not.toMatch(/tracking/);
    expect(r.className).toContain('text-[11px]');
  });

  it('lets explicit sizes override the variant size', () => {
    const r = resolveTextClasses('text-[14px]', { variant: 'headline-sm', arabic: false });
    expect(r.className).toBe('text-[14px]');
  });

  it('detects Arabic', () => {
    expect(containsArabic('ناقصنا واحد')).toBe(true);
    expect(containsArabic('NJM-8701')).toBe(false);
  });
});

describe('icons', () => {
  it('ships every icon the tab bar uses', () => {
    for (const name of ['home', 'stadium', 'sports_soccer', 'leaderboard', 'military_tech']) {
      expect(GLYPHS, name).toHaveProperty(name);
    }
  });
});
