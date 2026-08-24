export const MAX_EXPORT_HISTORY = 5;

export type ExportHistoryEntry = {
  format: "json" | "csv";
  itemCount: number;
  exportedAt: string;
};

export const isValidExportHistoryEntry = (value: unknown): value is ExportHistoryEntry => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExportHistoryEntry>;
  return (candidate.format === "json" || candidate.format === "csv")
    && typeof candidate.itemCount === "number"
    && Number.isInteger(candidate.itemCount)
    && candidate.itemCount > 0
    && candidate.itemCount <= 5000
    && typeof candidate.exportedAt === "string"
    && !Number.isNaN(new Date(candidate.exportedAt).getTime());
};

export const normalizeExportHistory = (value: unknown): ExportHistoryEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidExportHistoryEntry).slice(0, MAX_EXPORT_HISTORY);
};

export const appendExportHistory = (history: ExportHistoryEntry[], entry: ExportHistoryEntry) => [entry, ...normalizeExportHistory(history)].slice(0, MAX_EXPORT_HISTORY);
export const clearExportHistory = (): ExportHistoryEntry[] => [];

export const formatExportHistoryLabel = (entry: ExportHistoryEntry) => `${entry.format.toUpperCase()} · ${entry.itemCount} item${entry.itemCount === 1 ? "" : "s"}`;
export const getLatestExportStatusLabel = (entry: ExportHistoryEntry | null) => entry ? `Latest export: ${formatExportHistoryLabel(entry)}` : "No exports yet";
export const getExportHistoryDetailLabel = (entries: ExportHistoryEntry[]) => `Export history: ${entries.length} record${entries.length === 1 ? "" : "s"}`;
export const getLastExportShortcutLabel = (entry: ExportHistoryEntry | null) => entry ? `Review last ${entry.format.toUpperCase()} export · ${entry.itemCount} item${entry.itemCount === 1 ? "" : "s"}` : "Open archive browser";
export const getLastExportFormatPresetLabel = (entry: ExportHistoryEntry | null) => entry ? `Recommended format from the last export: ${entry.format.toUpperCase()}. This preference is temporary.` : "No temporary format preference";
export const getRecommendedExportActionLabel = (entry: ExportHistoryEntry | null) => entry ? `Share ${entry.format.toUpperCase()} now` : "Share recommended format";
export const getExportReviewWindowLabel = (selectedCount: number, visibleCount: number, windowSize = 20) => selectedCount > windowSize ? `Showing ${Math.min(visibleCount, windowSize)} of ${selectedCount} selected rows. All ${selectedCount} selected rows will be exported.` : `Reviewing all ${selectedCount} selected row${selectedCount === 1 ? "" : "s"} before export.`;
