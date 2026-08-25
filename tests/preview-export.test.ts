import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("import preview export safeguards", () => {
  it("shows an in-memory size estimate for selected preview rows", () => {
    expect(screenSource).toContain("getExportSizeEstimateLabel(selectedPreviewJsonSize, selectedPreviewCsvSize, null)");
    expect(screenSource).toContain("Estimates are calculated in memory; not saved.");
  });

  it("routes preview JSON and CSV shares through the common export handler", () => {
    expect(screenSource).toContain('shareImportedArchive("json", selectedPreviewItems, "selected-preview")');
    expect(screenSource).toContain('shareImportedArchive("csv", selectedPreviewItems, "selected-preview")');
    expect(screenSource).toContain("Large exports show a cancel-or-continue warning before sharing.");
  });
});
