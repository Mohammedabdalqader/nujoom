import * as SecureStore from 'expo-secure-store';

/**
 * Where the Supabase session lives on phones (D-025): the OS keystore (Keychain on iOS, Keystore-
 * backed encrypted storage on Android) via expo-secure-store, so tokens are encrypted at rest.
 * Values over ~2 KB can fail on Android, and a session with Google identity data is bigger, so
 * values are split into chunks: `<key>.n` holds the count, `<key>.0…` the parts.
 */
const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** SecureStore keys allow only [A-Za-z0-9._-]. */
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function removeChunks(key: string, from: number): Promise<void> {
  const count = Number((await SecureStore.getItemAsync(`${key}.n`, OPTIONS)) ?? 0);
  for (let i = from; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
}

export const sessionStorage = {
  async getItem(name: string): Promise<string | null> {
    const key = safe(name);
    const count = Number((await SecureStore.getItemAsync(`${key}.n`, OPTIONS)) ?? 0);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null; // torn write: treat as signed out rather than corrupt
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(name: string, value: string): Promise<void> {
    const key = safe(name);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
    await removeChunks(key, parts.length);
    for (let i = 0; i < parts.length; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, parts[i]!, OPTIONS);
    }
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length), OPTIONS);
  },
  async removeItem(name: string): Promise<void> {
    const key = safe(name);
    await removeChunks(key, 0);
    await SecureStore.deleteItemAsync(`${key}.n`, OPTIONS);
  },
};
