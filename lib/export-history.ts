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
