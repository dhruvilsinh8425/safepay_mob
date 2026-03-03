import * as SecureStore from "expo-secure-store";

export const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  userRole: "userRole",
  mockUser: "mockUser",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export async function setItem(key: StorageKey, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    if (__DEV__) {
      console.warn("SecureStore setItem failed", { key, error });
    }
    throw error;
  }
}

export async function getItem(key: StorageKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    if (__DEV__) {
      console.warn("SecureStore getItem failed", { key, error });
    }
    return null;
  }
}

export async function deleteItem(key: StorageKey): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    if (__DEV__) {
      console.warn("SecureStore deleteItem failed", { key, error });
    }
  }
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    deleteItem(STORAGE_KEYS.accessToken),
    deleteItem(STORAGE_KEYS.refreshToken),
    deleteItem(STORAGE_KEYS.userRole),
    deleteItem(STORAGE_KEYS.mockUser),
  ]);
}
