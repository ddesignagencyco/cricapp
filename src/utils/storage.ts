import AsyncStorage from '@react-native-async-storage/async-storage';

/** JSON wrapper over AsyncStorage that never throws. */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Preferences are a convenience; losing one is not worth surfacing.
    }
  },
};
