import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("export retry recovery", () => {
  it("retains the failed format and selected item context", () => {
    expect(screenSource).toContain("const [failedExport, setFailedExport]");
    expect(screenSource).toContain("setFailedExport({ format, items, exportLabel })");
    expect(screenSource).toContain("shareImportedArchive(failedExport.format, failedExport.items, failedExport.exportLabel)");
  });

  it("exposes an accessible retry action", () => {
    expect(screenSource).toContain("Retry ${failedExport.format.toUpperCase()} export");
    expect(screenSource).toContain("preserved selected rows and format");
  });
});
