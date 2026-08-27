import { LocalStorage } from '@vicinae/api';

interface StorageItem<T> {
  data: T;
  expireAt: number | null;
}

export class ExpiredStorage {
  static async getItem<T>(key: string): Promise<T | undefined> {
    const item = await LocalStorage.getItem<string>(key);
    if (!item) {
      return undefined;
    }

    try {
      const parsed: StorageItem<T> = JSON.parse(item);

      if (parsed.expireAt && Date.now() > parsed.expireAt) {
        await LocalStorage.removeItem(key);
        return undefined;
      }

      return parsed.data;
    } catch {
      return undefined;
    }
  }

  static async setItem<T>(key: string, value: T, expireInMs?: number): Promise<void> {
    const item: StorageItem<T> = {
      data: value,
      expireAt: expireInMs ? Date.now() + expireInMs : null,
    };
    await LocalStorage.setItem(key, JSON.stringify(item));
  }

  static async removeItem(key: string): Promise<void> {
    await LocalStorage.removeItem(key);
  }

  static async clear(): Promise<void> {
    await LocalStorage.clear();
  }
}
