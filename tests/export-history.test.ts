import { describe, expect, it } from "vitest";

import { appendExportHistory, formatExportHistoryLabel, MAX_EXPORT_HISTORY, normalizeExportHistory } from "../lib/export-history";

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

  it("formats a readable local-history label", () => {
    expect(formatExportHistoryLabel({ format: "csv", itemCount: 1, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("CSV · 1 item");
    expect(formatExportHistoryLabel({ format: "json", itemCount: 3, exportedAt: "2026-08-24T12:00:00.000Z" })).toBe("JSON · 3 items");
  });
});
