/**
 * The web preview has no OS keystore; the browser's localStorage holds the session there, as the
 * Supabase web client does by default. Phones use session-storage.ts (encrypted, D-025).
 */
export const sessionStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(name, value);
    } catch {
      // private mode or storage full: the session simply won't survive a reload
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(name);
    } catch {
      // nothing to remove
    }
  },
};
