import { describe, expect, it, vi } from 'vitest';

import { ConfigError, selectSource, type DataSource } from './source';

const demo = { name: 'demo' } as unknown as DataSource;
const supa = { name: 'supabase' } as unknown as DataSource;

function load() {
  return { demo: vi.fn(() => demo), supabase: vi.fn(() => supa) };
}

const good = {
  supabaseUrl: 'https://lowqyfbmzeixnadamezx.supabase.co',
  supabaseAnonKey: 'public-anon-key',
};

describe('selectSource (C-005)', () => {
  it('uses fixtures only in the demo build, without touching the backend loader', () => {
    const l = load();
    expect(selectSource({ variant: 'demo', ...good }, l)).toBe(demo);
    expect(l.supabase).not.toHaveBeenCalled();
  });

  it('uses Supabase in production and never loads fixtures', () => {
    const l = load();
    expect(selectSource({ variant: 'production', ...good }, l)).toBe(supa);
    expect(l.supabase).toHaveBeenCalledWith({
      url: good.supabaseUrl,
      anonKey: good.supabaseAnonKey,
    });
    expect(l.demo).not.toHaveBeenCalled();
  });

  it('hard-fails in production without valid backend config instead of falling back', () => {
    for (const env of [
      { variant: 'production', supabaseUrl: undefined, supabaseAnonKey: 'k' },
      { variant: 'production', supabaseUrl: good.supabaseUrl, supabaseAnonKey: ' ' },
      { variant: 'production', supabaseUrl: 'http://example.com', supabaseAnonKey: 'k' },
    ]) {
      const l = load();
      expect(() => selectSource(env, l)).toThrow(ConfigError);
      expect(l.demo).not.toHaveBeenCalled();
    }
  });

  it('lets a development bundle without a variant run the demo, never a release bundle', () => {
    const l = load();
    expect(selectSource({ variant: undefined, dev: true, ...good }, l)).toBe(demo);
    expect(() => selectSource({ variant: undefined, dev: false, ...good }, load())).toThrow(
      ConfigError,
    );
    // An explicit production variant in development still needs real config.
    expect(() =>
      selectSource(
        { variant: 'production', dev: true, supabaseUrl: '', supabaseAnonKey: '' },
        load(),
      ),
    ).toThrow(ConfigError);
  });

  it('refuses an unknown or missing variant', () => {
    for (const variant of [undefined, '', 'preview', 'Demo']) {
      const l = load();
      expect(() => selectSource({ variant, ...good }, l)).toThrow(ConfigError);
      expect(l.demo).not.toHaveBeenCalled();
      expect(l.supabase).not.toHaveBeenCalled();
    }
  });
});
