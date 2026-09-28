import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  configSchemas,
  DEFAULT_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  parseConfigValue,
  type ConfigKey,
} from './config';

const settingsSql = fs.readFileSync(
  new URL('../../../supabase/migrations/20260928000400_settings.sql', import.meta.url),
  'utf8',
);

describe('config', () => {
  it('defaults satisfy their schemas', () => {
    for (const key of Object.keys(configSchemas) as ConfigKey[]) {
      expect(configSchemas[key].safeParse(DEFAULT_CONFIG[key]).success, key).toBe(true);
    }
  });

  it('matches the defaults seeded by the settings migration', () => {
    const rows = [...settingsSql.matchAll(/\('([a-z_]+)', '([^']+)',/g)];
    const seeded = Object.fromEntries(rows.map(([, key, json]) => [key, JSON.parse(json!)]));
    expect(seeded).toEqual(DEFAULT_CONFIG);
  });

  it('matches the seeded feature flags', () => {
    const rows = [...settingsSql.matchAll(/\('([a-z_]+)', (true|false),/g)];
    const seeded = Object.fromEntries(rows.map(([, key, on]) => [key, on === 'true']));
    expect(seeded).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(Object.keys(seeded).sort()).toEqual([...FEATURE_FLAGS].sort());
  });

  it('falls back to defaults for invalid values', () => {
    expect(parseConfigValue('min_age', 'thirteen')).toBe(13);
    expect(parseConfigValue('min_age', 14)).toBe(14);
    expect(parseConfigValue('voting', { window_hours: 0 })).toEqual({ window_hours: 24 });
  });

  it('keeps the clip window promise of "the last 30 seconds"', () => {
    expect(DEFAULT_CONFIG.recording.clip_before_seconds).toBe(30);
  });
});
