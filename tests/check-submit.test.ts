import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const scriptPath = join(process.cwd(), "scripts/check-submit.mjs");

type Result = { status: number; output: string };

function runPreflight(configPath: string, mode: "strict" | "advisory" = "strict"): Result {
  const args = [scriptPath, "--config", configPath];
  if (mode === "strict") args.push("--strict");

  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function withConfig(contents: string, callback: (configPath: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-submit-"));
  const configPath = join(directory, "eas.json");
  writeFileSync(configPath, contents);
  try {
    callback(configPath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("App Store submission preflight", () => {
  it("passes for a numeric App Store Connect ID", () => {
    withConfig(JSON.stringify({
      build: { production: { distribution: "store", ios: { simulator: false } } },
      submit: { production: { ios: { ascAppId: "123456789" } } },
    }), (configPath) => {
      const result = runPreflight(configPath);
      expect(result.status).toBe(0);
      expect(result.output).toContain("preflight passed");
    });
  });

  it("blocks a non-store production build profile", () => {
    withConfig(JSON.stringify({
      build: { production: { distribution: "internal", ios: { simulator: false } } },
      submit: { production: { ios: { ascAppId: "123456789" } } },
    }), (configPath) => {
      const result = runPreflight(configPath);
      expect(result.status).toBe(1);
      expect(result.output).toContain('build.production must use "store" distribution');
    });
  });

  it("blocks a production simulator build", () => {
    withConfig(JSON.stringify({
      build: { production: { distribution: "store", ios: { simulator: true } } },
      submit: { production: { ios: { ascAppId: "123456789" } } },
    }), (configPath) => {
      const result = runPreflight(configPath);
      expect(result.status).toBe(1);
      expect(result.output).toContain("build.production.ios.simulator must be false");
    });
  });

  it("blocks the unresolved placeholder in strict mode", () => {
    withConfig(JSON.stringify({ submit: { production: { ios: { ascAppId: "REPLACE_WITH_APP_STORE_CONNECT_APP_ID" } } } }), (configPath) => {
      const result = runPreflight(configPath);
      expect(result.status).toBe(1);
      expect(result.output).toContain("numeric App Store Connect App ID");
    });
  });

  it("reports malformed JSON without exposing a parser exception", () => {
    withConfig("{ malformed", (configPath) => {
      const result = runPreflight(configPath);
      expect(result.status).toBe(1);
      expect(result.output).toContain("eas.json is not valid JSON");
      expect(result.output).not.toContain("SyntaxError");
    });
  });

  it("reports a missing configuration file without a filesystem exception", () => {
    const directory = mkdtempSync(join(tmpdir(), "archive-alchemist-submit-"));
    const configPath = join(directory, "missing.json");
    try {
      const result = runPreflight(configPath);
      expect(result.status).toBe(1);
      expect(result.output).toContain("EAS configuration file was not found");
      expect(result.output).not.toContain("ENOENT");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps advisory mode non-blocking when the ID is not configured", () => {
    withConfig(JSON.stringify({ submit: { production: { ios: {} } } }), (configPath) => {
      const result = runPreflight(configPath, "advisory");
      expect(result.status).toBe(0);
      expect(result.output).toContain("preflight blocked");
    });
  });
});

