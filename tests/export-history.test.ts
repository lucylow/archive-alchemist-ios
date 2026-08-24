import { describe, expect, it } from "vitest";

import { appendExportHistory, clearExportHistory, formatExportHistoryLabel, getExportHistoryDetailLabel, getLastExportFormatPresetLabel, getLastExportShortcutLabel, getLatestExportStatusLabel, MAX_EXPORT_HISTORY, normalizeExportHistory } from "../lib/export-history";

describe("export history", () => {
  it("keeps only valid metadata and excludes archive content", () => {
    expect(normalizeExportHistory([
      { format: "json", itemCount: 2, exportedAt: "2026-08-24T12:00:00.000Z" },
      { format: "pdf", itemCount: 2, exportedAt: "2026-08-24T12:00:00.000Z", title: "secret" },
      { format: "csv", itemCount: 0, exportedAt: "2026-08-24T12:00:00.000Z" },
    ])).toEqual([{ format: "json", itemCount: 2, exportedAt: "2026-08-24T12:00:00.000Z" }]);
  });

  it("prepends successful exports and bounds retention", () => {
    const history = Array.from({ length: MAX_EXPORT_HISTORY }, (_, index) => ({ format: "json" as const, itemCount: index + 1, exportedAt: `2026-08-2${index + 1}T12:00:00.000Z` }));
    const next = appendExportHistory(history, { format: "csv", itemCount: 9, exportedAt: "2026-08-30T12:00:00.000Z" });
    expect(next).toHaveLength(MAX_EXPORT_HISTORY);
    expect(next[0].format).toBe("csv");
    expect(next.at(-1)?.itemCount).toBe(4);
  });

  it("clears history without mutating the previous collection", () => {
    const history = [{ format: "json" as const, itemCount: 2, exportedAt: "2026-08-24T12:00:00.000Z" }];
    expect(clearExportHistory()).toEqual([]);
    expect(clearExportHistory()).not.toBe(history);
    expect(history).toHaveLength(1);
  });

  it("formats export-history detail labels consistently", () => {
    expect(getExportHistoryDetailLabel([])).toBe("Export history: 0 records");
    expect(getExportHistoryDetailLabel([{ format: "json", itemCount: 1, exportedAt: "2026-08-24T12:00:00.000Z" }])).toBe("Export history: 1 record");
  });

  it("formats last-export shortcut labels consistently", () => {
    expect(getLastExportShortcutLabel(null)).toBe("Open archive browser");
    expect(getLastExportShortcutLabel({ format: "json", itemCount: 1, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("Review last JSON export · 1 item");
    expect(getLastExportShortcutLabel({ format: "csv", itemCount: 4, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("Review last CSV export · 4 items");
  });

  it("formats temporary last-export format presets consistently", () => {
    expect(getLastExportFormatPresetLabel(null)).toBe("No temporary format preference");
    expect(getLastExportFormatPresetLabel({ format: "csv", itemCount: 3, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("Recommended format from the last export: CSV. This preference is temporary.");
  });

  it("formats latest-export status consistently", () => {
    expect(getLatestExportStatusLabel(null)).toBe("No exports yet");
    expect(getLatestExportStatusLabel({ format: "json", itemCount: 1, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("Latest export: JSON · 1 item");
    expect(getLatestExportStatusLabel({ format: "csv", itemCount: 4, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("Latest export: CSV · 4 items");
  });

  it("formats a readable local-history label", () => {
    expect(formatExportHistoryLabel({ format: "csv", itemCount: 1, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("CSV · 1 item");
    expect(formatExportHistoryLabel({ format: "json", itemCount: 3, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("JSON · 3 items");
  });
});
