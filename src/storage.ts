const STORAGE_PREFIX = 'rivium_ab_testing_';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
    } catch {
      // Storage full or blocked — silently fail
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // Silently fail
    }
  },

  async getAllKeys(): Promise<string[]> {
    if (!isBrowser()) return [];
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      return keys;
    } catch {
      return [];
    }
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (!isBrowser()) return keys.map((k) => [k, null]);
    return keys.map((key) => {
      try {
        return [key, localStorage.getItem(`${STORAGE_PREFIX}${key}`)];
      } catch {
        return [key, null];
      }
    });
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (!isBrowser()) return;
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Silently fail
      }
    }
  },
};
