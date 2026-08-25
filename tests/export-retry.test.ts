import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("export retry recovery", () => {
  it("retains the failed format and selected item context", () => {
    expect(screenSource).toContain("const [failedExport, setFailedExport]");
    expect(screenSource).toContain("setFailedExport({ format, items, exportLabel })");
    expect(screenSource).toContain("shareImportedArchive(failedExport.format, failedExport.items, failedExport.exportLabel)");
  });

  it("exposes an in-context retry action for the selected-browser review", () => {
    expect(screenSource).toContain('failedExport?.exportLabel === "selected-browser"');
    expect(screenSource).toContain("without leaving this review or changing the selected rows");
  });

  it("exposes an in-context retry action for import preview", () => {
    expect(screenSource).toContain('failedExport?.exportLabel === "selected-preview"');
    expect(screenSource).toContain("without changing the current selection, filters, or sort order");
  });

  it("exposes an accessible retry action", () => {
    expect(screenSource).toContain("Retry ${failedExport.format.toUpperCase()} export");
    expect(screenSource).toContain("preserved selected rows and format");
  });
});
