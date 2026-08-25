import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("import preview export safeguards", () => {
  it("shows an in-memory size estimate for selected preview rows", () => {
    expect(screenSource).toContain("getExportSizeEstimateLabel(selectedPreviewJsonSize, selectedPreviewCsvSize, null)");
    expect(screenSource).toContain("Estimates are calculated in memory; not saved.");
  });

  it("exposes an accessible transient recommended-format badge", () => {
    expect(screenSource).toContain("previewFormatBadge");
    expect(screenSource).toContain("RECOMMENDED");
    expect(screenSource).toContain("temporary recommended preview export format from the last export");
  });

  it("exposes a transient recommended-format action without persisting preview contents", () => {
    expect(screenSource).toContain("exportRecommendedPreviewFormat");
    expect(screenSource).toContain('shareImportedArchive(preferredExportFormat, selectedPreviewItems, "selected-preview")');
    expect(screenSource).toContain("temporary format recommendation from the last export");
  });

  it("routes preview JSON and CSV shares through the common export handler", () => {
    expect(screenSource).toContain('shareImportedArchive("json", selectedPreviewItems, "selected-preview")');
    expect(screenSource).toContain('shareImportedArchive("csv", selectedPreviewItems, "selected-preview")');
    expect(screenSource).toContain("Large exports show a cancel-or-continue warning before sharing.");
  });
});
