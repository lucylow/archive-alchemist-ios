import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(),
}));

vi.mock("expo-secure-store", () => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import * as SecureStore from "expo-secure-store";

import { getUserInfo } from "../lib/_core/auth";
import { USER_INFO_KEY } from "../constants/oauth";

const getItemAsync = vi.mocked(SecureStore.getItemAsync);
const deleteItemAsync = vi.mocked(SecureStore.deleteItemAsync);

describe("cached user cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteItemAsync.mockResolvedValue(undefined);
  });

  it("removes malformed JSON after a failed parse", async () => {
    getItemAsync.mockResolvedValue("not-json");

    await expect(getUserInfo()).resolves.toBeNull();
    expect(deleteItemAsync).toHaveBeenCalledWith(USER_INFO_KEY);
  });

  it("removes an invalid identity after normalization failure", async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({ id: 7, openId: "" }));

    await expect(getUserInfo()).resolves.toBeNull();
    expect(deleteItemAsync).toHaveBeenCalledWith(USER_INFO_KEY);
  });

  it("keeps a valid cached user and does not delete it", async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({
      id: 7,
      openId: "creator-7",
      name: "Creator",
      email: "creator@example.com",
      loginMethod: "oauth",
      lastSignedIn: "2026-08-24T00:00:00.000Z",
    }));

    const user = await getUserInfo();

    expect(user?.openId).toBe("creator-7");
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });
});
