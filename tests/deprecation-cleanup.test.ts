import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("Expo web deprecation cleanup", () => {
  it("uses boxShadow for the app-owned loading mark", () => {
    expect(screenSource).toContain("boxShadow: \"0px 4px 12px rgba(244, 201, 93, 0.35)\"");
    expect(screenSource).not.toContain("shadowColor:");
    expect(screenSource).not.toContain("shadowOpacity:");
    expect(screenSource).not.toContain("shadowRadius:");
    expect(screenSource).not.toContain("shadowOffset:");
  });

  it("does not add pointerEvents as a direct prop in the app screen", () => {
    expect(screenSource).not.toMatch(/<[^>]+\spointerEvents=/);
  });
});
