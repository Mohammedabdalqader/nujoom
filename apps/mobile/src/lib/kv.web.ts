// Web target (browser preview): the browser's own localStorage; expo-sqlite is native-only here.
const store = typeof window === 'undefined' ? null : window.localStorage;

export const kv = {
  get: (key: string): string | null => store?.getItem(key) ?? null,
  set: (key: string, value: string): void => store?.setItem(key, value),
  remove: (key: string): void => store?.removeItem(key),
};

export const sessionStorage = store ?? undefined;
