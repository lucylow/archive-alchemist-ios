import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = { OS: "ios" as "ios" | "web" };
const linking = {
  canOpenURL: vi.fn(),
  createURL: vi.fn(),
  getInitialURL: vi.fn(),
  openURL: vi.fn(),
};

vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("expo-linking", () => linking);

describe("OAuth launch result", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    platform.OS = "ios";
    linking.createURL.mockReturnValue("archivealchemist://oauth/callback");
    linking.openURL.mockResolvedValue(undefined);
    vi.stubEnv("EXPO_PUBLIC_OAUTH_PORTAL_URL", "https://manus.im");
    vi.stubEnv("EXPO_PUBLIC_APP_ID", "archive-alchemist");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "");
  });

  it("returns true after opening a supported native sign-in URL", async () => {
    linking.canOpenURL.mockResolvedValue(true);
    const { startOAuthLogin } = await import("../constants/oauth");

    await expect(startOAuthLogin()).resolves.toBe(true);
    expect(linking.canOpenURL).toHaveBeenCalledOnce();
    expect(linking.openURL).toHaveBeenCalledOnce();
  });

  it("returns false when the device cannot open the sign-in URL", async () => {
    linking.canOpenURL.mockResolvedValue(false);
    const { startOAuthLogin } = await import("../constants/oauth");

    await expect(startOAuthLogin()).resolves.toBe(false);
    expect(linking.openURL).not.toHaveBeenCalled();
  });

  it("returns false when the platform launch check throws", async () => {
    linking.canOpenURL.mockRejectedValue(new Error("unavailable"));
    const { startOAuthLogin } = await import("../constants/oauth");

    await expect(startOAuthLogin()).resolves.toBe(false);
    expect(linking.openURL).not.toHaveBeenCalled();
  });

  it("returns false without attempting a launch when configuration is missing", async () => {
    vi.stubEnv("EXPO_PUBLIC_OAUTH_PORTAL_URL", "");
    const { startOAuthLogin } = await import("../constants/oauth");

    await expect(startOAuthLogin()).resolves.toBe(false);
    expect(linking.canOpenURL).not.toHaveBeenCalled();
  });
});
