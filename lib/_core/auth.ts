import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";
import {
  readStorageValue,
  removeStorageValue,
  writeRequiredStorageValue,
  writeStorageValue,
} from "./storage-safety";

export type User = {
  id: number;
  role?: "user" | "admin";
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

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
    return JSON.parse(info) as User;
  } catch {
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
