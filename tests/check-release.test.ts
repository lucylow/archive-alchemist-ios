import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
        writeFileSync(absolutePath, relativePath === "eas.json" ? "{ invalid" : "placeholder");
      }

      const result = runPreflight(directory);
      expect(result.status).toBe(1);
      expect(result.output).toContain("eas.json is not valid JSON");
      expect(result.output).not.toContain("SyntaxError");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
