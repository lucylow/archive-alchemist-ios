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
export const getExportReviewWindowToggleLabel = (selectedCount: number, expanded: boolean) => selectedCount <= 20 ? "" : expanded ? "Show first 20 selected rows" : `Inspect up to ${Math.min(selectedCount, 100)} selected rows`;
export const getUtf8ByteLength = (value: string) => Array.from(value).reduce((total, character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return total + (codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4);
}, 0);
export const formatExportSizeEstimate = (bytes: number) => bytes < 1024 ? `${Math.max(1, Math.round(bytes))} B` : `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
export const getExportSizeEstimateLabel = (jsonBytes: number, csvBytes: number, preferredFormat: "json" | "csv" | null) => preferredFormat ? `Approximate ${preferredFormat.toUpperCase()} size: ${formatExportSizeEstimate(preferredFormat === "json" ? jsonBytes : csvBytes)}. Calculated in memory; not saved.` : `Approximate sizes: JSON ${formatExportSizeEstimate(jsonBytes)} · CSV ${formatExportSizeEstimate(csvBytes)}. Calculated in memory; not saved.`;
export const LARGE_EXPORT_WARNING_BYTES = 256 * 1024;
export const getLargeExportWarningLabel = (format: "json" | "csv", bytes: number) => bytes >= LARGE_EXPORT_WARNING_BYTES ? `This ${format.toUpperCase()} export is approximately ${formatExportSizeEstimate(bytes)}. Preparing a large file may take longer, and the share sheet will open when it is ready.` : null;
export const MAX_EXPORT_RETRY_ATTEMPTS = 3;
/** Confirmation remains visible longer when Reduce Motion is enabled, giving users more time to notice non-animated feedback. */
export const EXPORT_DIAGNOSTICS_CONFIRMATION_DURATION_MS = 5_000;
export const EXPORT_DIAGNOSTICS_REDUCED_MOTION_DURATION_MS = 10_000;
export const getExportDiagnosticsConfirmationDuration = (reduceMotion: boolean) => reduceMotion ? EXPORT_DIAGNOSTICS_REDUCED_MOTION_DURATION_MS : EXPORT_DIAGNOSTICS_CONFIRMATION_DURATION_MS;
export const getExportRetryAttemptLabel = (attempt: number, maxAttempts = MAX_EXPORT_RETRY_ATTEMPTS) => `Retry attempt ${Math.min(Math.max(1, attempt), maxAttempts)} of ${maxAttempts}`;
export const getExportRetryLimitLabel = (format: "json" | "csv", maxAttempts = MAX_EXPORT_RETRY_ATTEMPTS) => `${format.toUpperCase()} export retry limit reached after ${maxAttempts} attempts. Start the export again to create a fresh retry window.`;
export type ExportFailureStage = "availability" | "prepare" | "share";
export const getExportFailureStageLabel = (stage: ExportFailureStage) => stage === "availability" ? "Sharing service unavailable" : stage === "share" ? "Share sheet could not open" : "Export file preparation failed";
export const getExportFailureDiagnosticLabel = (format: "json" | "csv", stage: ExportFailureStage) => `${format.toUpperCase()} export stopped at: ${getExportFailureStageLabel(stage)}. No archive content or raw error details are included.`;
export const getExportFailureRecoveryGuidance = (stage: ExportFailureStage) => stage === "availability" ? "Check that this device supports sharing, then try again." : stage === "share" ? "Close any open share sheet, confirm a destination is available, then try again." : "Check available device storage, then start a fresh export.";
export type DiagnosticsClipboardPlatform = "ios" | "android" | "web" | "default";
export type DiagnosticsExportContext = "archive" | "preview" | "browser";
export const getDiagnosticsExportContext = (exportLabel: string): DiagnosticsExportContext => exportLabel === "selected-preview" ? "preview" : exportLabel === "selected-browser" ? "browser" : "archive";
export const getDiagnosticsExportContextLabel = (context: DiagnosticsExportContext) => context === "preview" ? "selected import preview" : context === "browser" ? "selected archive browser rows" : "archive export";
export const getDiagnosticsCopiedNotice = (platform: DiagnosticsClipboardPlatform, format: "json" | "csv" = "json", context: DiagnosticsExportContext = "archive") => {
  const prefix = `${format.toUpperCase()} ${getDiagnosticsExportContextLabel(context)} diagnostics copied`;
  return platform === "web" ? `${prefix} safely to the clipboard. No archive content was included.` : platform === "ios" ? `${prefix} safely on iPhone or iPad. No archive content was included.` : platform === "android" ? `${prefix} safely on Android. No archive content was included.` : `${prefix} safely. No archive content was included.`;
};
export const getDiagnosticsCopyFailureNotice = (platform: DiagnosticsClipboardPlatform, format: "json" | "csv" = "json", context: DiagnosticsExportContext = "archive") => {
  const prefix = `${format.toUpperCase()} ${getDiagnosticsExportContextLabel(context)} diagnostics`;
  return platform === "web" ? `${prefix} could not be copied because the browser clipboard was unavailable. No archive content was exposed; try again or use the visible diagnostics text.` : platform === "ios" ? `${prefix} could not be copied because the iOS clipboard was unavailable. No archive content was exposed; try again or use the visible diagnostics text.` : platform === "android" ? `${prefix} could not be copied because the Android clipboard was unavailable. No archive content was exposed; try again or use the visible diagnostics text.` : `${prefix} could not be copied. No archive content was exposed; try again.`;
};
export const getDiagnosticsCopyOutcome = (platform: DiagnosticsClipboardPlatform, copied: boolean, format: "json" | "csv" = "json", context: DiagnosticsExportContext = "archive") => ({
  copied,
  notice: copied ? getDiagnosticsCopiedNotice(platform, format, context) : getDiagnosticsCopyFailureNotice(platform, format, context),
});
