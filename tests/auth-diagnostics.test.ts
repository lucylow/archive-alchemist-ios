import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const authSource = readFileSync(join(process.cwd(), "lib/_core/auth.ts"), "utf8");

describe("client auth diagnostics", () => {
  it("does not emit console diagnostics from credential or user-cache helpers", () => {
    expect(authSource).not.toMatch(/console\.(log|warn|error)/);
  });

  it("does not log token fragments or serialized user objects", () => {
    expect(authSource).not.toContain("substring(0, 20)");
    expect(authSource).not.toMatch(/console\.(log|warn|error)[^\n]*user/);
  });
});
