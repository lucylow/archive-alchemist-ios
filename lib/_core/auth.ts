import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "../../constants/oauth";
import {
  readStorageValue,
  removeStorageValue,
  writeRequiredStorageValue,
  writeStorageValue,
} from "./storage-safety";
import { normalizeCachedUser, type CachedUser } from "./user-cache";

export type User = CachedUser;

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  return readStorageValue(() => SecureStore.getItemAsync(SESSION_TOKEN_KEY));
}

export async function setSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await writeRequiredStorageValue(() => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token));
}

export async function removeSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await removeStorageValue(() => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY));
}

export async function getUserInfo(): Promise<User | null> {
  const info = await readStorageValue(async () => {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(USER_INFO_KEY);
    }
    return SecureStore.getItemAsync(USER_INFO_KEY);
  });

  if (!info) {
    return null;
  }

  try {
    const normalized = normalizeCachedUser(JSON.parse(info));
    if (!normalized) {
      await removeStorageValue(() => {
        if (Platform.OS === "web") {
          window.localStorage.removeItem(USER_INFO_KEY);
          return Promise.resolve();
        }
        return SecureStore.deleteItemAsync(USER_INFO_KEY);
      });
    }
    return normalized;
  } catch {
    await removeStorageValue(() => {
      if (Platform.OS === "web") {
        window.localStorage.removeItem(USER_INFO_KEY);
        return Promise.resolve();
      }
      return SecureStore.deleteItemAsync(USER_INFO_KEY);
    });
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  const serialized = JSON.stringify(user);
  await writeStorageValue(async () => {
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, serialized);
      return;
    }

    await SecureStore.setItemAsync(USER_INFO_KEY, serialized);
  });
}

export async function clearUserInfo(): Promise<void> {
  await removeStorageValue(async () => {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  });
}
