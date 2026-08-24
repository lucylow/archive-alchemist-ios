import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = join(process.cwd(), "scripts/check-release.mjs");
const requiredFiles = [
  "app.config.ts",
  "eas.json",
  "docs/APP_STORE_RELEASE.md",
  "assets/images/icon.png",
  "assets/images/splash-icon.png",
  "assets/images/favicon.png",
  "assets/images/android-icon-foreground.png",
  "assets/images/android-icon-background.png",
  "assets/images/android-icon-monochrome.png",
];
const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");

function fixtureContent(relativePath: string, content: string) {
  if (content !== "placeholder") return content;
  return relativePath.endsWith(".png") ? pngSignature : content;
}

function createFixture(directory: string, production: Record<string, unknown>) {
  const appConfig = [
    "Archive Alchemist",
    "com.archivealchemist.mobile",
    'version: "1.0.0"',
    'buildNumber: "1"',
    "NSPrivacyAccessedAPICategoryUserDefaults",
    'NSPrivacyAccessedAPITypeReasons: ["CA92.1"]',
    'ITSAppUsesNonExemptEncryption": false',
    'icon: "./assets/images/icon.png"',
    'image: "./assets/images/splash-icon.png"',
    'favicon: "./assets/images/favicon.png"',
    'foregroundImage: "./assets/images/android-icon-foreground.png"',
    'backgroundImage: "./assets/images/android-icon-background.png"',
    'monochromeImage: "./assets/images/android-icon-monochrome.png"',
  ].join("\n");
  const easConfig = {
    build: {
      development: {},
      preview: {},
      production,
    },
  };

  for (const relativePath of requiredFiles) {
    const absolutePath = join(directory, relativePath);
    const parent = absolutePath.slice(0, absolutePath.lastIndexOf("/"));
    if (parent) mkdirSync(parent, { recursive: true });
    writeFileSync(absolutePath, fixtureContent(relativePath, relativePath === "app.config.ts" ? appConfig : relativePath === "eas.json" ? JSON.stringify(easConfig) : "placeholder"));
  }
}

function runPreflight(cwd: string) {
  try {
    execFileSync(process.execPath, [scriptPath], { cwd, encoding: "utf8", stdio: "pipe" });
    return { status: 0, output: "" };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failure.status ?? -1, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

describe("release preflight failures", () => {
  it("reports missing files without a raw filesystem exception", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("Release preflight failed:");
      expect(result.output).toContain("Missing app.config.ts");
      expect(result.output).not.toContain("Error: ENOENT");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("reports malformed eas.json without a raw JSON exception", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      for (const relativePath of requiredFiles) {
        const absolutePath = join(directory, relativePath);
        const parent = absolutePath.slice(0, absolutePath.lastIndexOf("/"));
        if (parent) mkdirSync(parent, { recursive: true });
        writeFileSync(absolutePath, fixtureContent(relativePath, relativePath === "eas.json" ? "{ invalid" : "placeholder"));
      }

      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("eas.json is not valid JSON");
      expect(result.output).not.toContain("SyntaxError");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a missing iOS build number", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      const appConfigPath = join(directory, "app.config.ts");
      const appConfig = readFileSync(appConfigPath, "utf8").replace('buildNumber: "1"', "");
      writeFileSync(appConfigPath, appConfig);
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("app.config.ts must declare a positive numeric iOS buildNumber");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a non-numeric iOS build number", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      const appConfigPath = join(directory, "app.config.ts");
      const appConfig = readFileSync(appConfigPath, "utf8").replace('buildNumber: "1"', 'buildNumber: "beta"');
      writeFileSync(appConfigPath, appConfig);
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("app.config.ts must declare a positive numeric iOS buildNumber");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a non-store production distribution", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "internal", ios: { simulator: false } });
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain('production profile must use "store" distribution');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects stale Expo branding references", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      const appConfigPath = join(directory, "app.config.ts");
      const appConfig = readFileSync(appConfigPath, "utf8").replace(
        'icon: "./assets/images/icon.png"',
        'icon: "./assets/images/old-icon.png"',
      );
      writeFileSync(appConfigPath, appConfig);
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain('app.config.ts does not contain icon: "./assets/images/icon.png"');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects mismatched synchronized branding assets", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      writeFileSync(join(directory, "assets/images/splash-icon.png"), Buffer.concat([pngSignature, Buffer.from("different")]));
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("assets/images/splash-icon.png does not match assets/images/icon.png");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects an invalid PNG signature", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      writeFileSync(join(directory, "assets/images/icon.png"), "not a png");
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("assets/images/icon.png is not a valid PNG file");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a branding asset that is not a regular file", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: false } });
      rmSync(join(directory, "assets/images/icon.png"));
      mkdirSync(join(directory, "assets/images/icon.png"));
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("assets/images/icon.png is not a regular file");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a production iOS simulator build", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-release-"));
    try {
      createFixture(directory, { distribution: "store", ios: { simulator: true } });
      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("production iOS build must set simulator to false");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
