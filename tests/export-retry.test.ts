import { readFileSync } from "node:fs";
import { getDiagnosticsCopiedNotice, getDiagnosticsCopyFailureNotice, getDiagnosticsCopyOutcome, getExportDiagnosticsConfirmationDuration, EXPORT_DIAGNOSTICS_CONFIRMATION_DURATION_MS, EXPORT_DIAGNOSTICS_REDUCED_MOTION_DURATION_MS } from "../lib/export-history";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("/home/ubuntu/archive-alchemist-ios/app/(tabs)/index.tsx", "utf8");

describe("export retry recovery", () => {
  it("retains the failed format and selected item context", () => {
    expect(screenSource).toContain("const [failedExport, setFailedExport]");
    expect(screenSource).toContain("setFailedExport({ format, items, exportLabel, attempt: nextAttempt, failureStage })");
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

  it("exposes bounded retry-attempt feedback", () => {
    expect(screenSource).toContain("MAX_EXPORT_RETRY_ATTEMPTS");
    expect(screenSource).toContain("getExportRetryAttemptLabel(failedExport.attempt)");
    expect(screenSource).toContain("getExportRetryLimitLabel(format)");
  });

  it("exposes fresh-export recovery after the retry limit", () => {
    expect(screenSource).toContain("const startFreshExport = () => {");
    expect(screenSource).toContain("void shareImportedArchive(format, items, exportLabel, false, true)");
    expect(screenSource).toContain("Resets only the retry limit");
    expect(screenSource).toContain("Start fresh ${failedExport.format.toUpperCase()} export");
  });

  it("exposes privacy-safe failure-stage diagnostics", () => {
    expect(screenSource).toContain("failureStage: ExportFailureStage");
    expect(screenSource).toContain("getExportFailureDiagnosticLabel(format, failureStage)");
    expect(screenSource).toContain("getExportFailureDiagnosticLabel");
  });

  it("exposes stage-specific recovery guidance", () => {
    expect(screenSource).toContain("getExportFailureRecoveryGuidance");
    expect(screenSource).toContain("Next step: {getExportFailureRecoveryGuidance(failedExport.failureStage)}");
  });

  it("exposes privacy-safe copy diagnostics recovery", () => {
    expect(screenSource).toContain('import * as Clipboard from "expo-clipboard"');
    expect(screenSource).toContain("const copyExportDiagnostics = async () => {");
    expect(screenSource).toContain("getDiagnosticsCopyOutcome");
    expect(getDiagnosticsCopyFailureNotice("default")).toContain("No archive content was exposed");
    expect(screenSource).toContain("const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);");
    expect(screenSource).toContain('accessibilityLiveRegion="polite">Copied safely');
    expect(screenSource).toContain("const dismissDiagnosticsCopied = resetDiagnosticsCopied;");
    expect(screenSource).toContain('label="Dismiss"');
    expect(screenSource).toContain("Hides the copied confirmation");
    expect(screenSource).toContain("setFailedExport(null);\n    resetDiagnosticsCopied();");
    expect(screenSource).toContain("setFailedExport(null);\n        resetDiagnosticsCopied();");
    expect(screenSource).toContain("setNotice(null); setFailedExport(null); setDiagnosticsCopied(false);");
    expect(screenSource).toContain("Copies only the failure stage and format");
  });

  it("uses explicit accessibility-aware confirmation durations", () => {
    expect(getExportDiagnosticsConfirmationDuration(false)).toBe(EXPORT_DIAGNOSTICS_CONFIRMATION_DURATION_MS);
    expect(getExportDiagnosticsConfirmationDuration(true)).toBe(EXPORT_DIAGNOSTICS_REDUCED_MOTION_DURATION_MS);
    expect(EXPORT_DIAGNOSTICS_REDUCED_MOTION_DURATION_MS).toBeGreaterThan(EXPORT_DIAGNOSTICS_CONFIRMATION_DURATION_MS);
  });

  it("uses privacy-safe platform-aware clipboard feedback", () => {
    const cases = [
      ["ios", "iPhone or iPad"],
      ["android", "Android"],
      ["web", "clipboard"],
      ["default", "Privacy-safe export diagnostics copied"],
    ] as const;
    for (const [platform, expectedText] of cases) {
      const notice = getDiagnosticsCopiedNotice(platform);
      expect(notice).toContain(expectedText);
      expect(notice).toContain("No archive content was included");
      expect(notice).not.toContain("title");
      expect(notice).not.toContain("URL");
    }
    expect(screenSource).toContain("getDiagnosticsCopyOutcome");
    expect(screenSource).toContain('RNPlatform.OS === "ios"');
    expect(screenSource).toContain('RNPlatform.OS === "web"');
  });

  it("models clipboard success and rejection outcomes directly", () => {
    const success = getDiagnosticsCopyOutcome("ios", true);
    expect(success.copied).toBe(true);
    expect(success.notice).toBe(getDiagnosticsCopiedNotice("ios"));
    const failure = getDiagnosticsCopyOutcome("ios", false);
    expect(failure.copied).toBe(false);
    expect(failure.notice).toBe(getDiagnosticsCopyFailureNotice("ios"));
    expect(failure.notice).toContain("No archive content was exposed");
  });

  it("keeps clipboard failure feedback privacy-safe across platforms", () => {
    for (const platform of ["ios", "android", "web", "default"] as const) {
      const notice = getDiagnosticsCopyFailureNotice(platform);
      expect(notice).toContain("No archive content was exposed");
      expect(notice).not.toContain("title");
      expect(notice).not.toContain("URL");
      expect(notice).not.toContain("Error:");
    }
    expect(getDiagnosticsCopyFailureNotice("web")).toContain("browser clipboard");
    expect(getDiagnosticsCopyFailureNotice("ios")).toContain("iOS clipboard");
    expect(screenSource).toContain("getDiagnosticsCopyOutcome");
    expect(screenSource).toContain("setDiagnosticsCopied(outcome.copied);");
    expect(screenSource).toContain("resetDiagnosticsCopied();");
  });

  it("exposes bounded automatic confirmation expiry", () => {
    expect(screenSource).toContain("diagnosticsExpiryTimerRef");
    expect(screenSource).toContain("const diagnosticsConfirmationDuration = getExportDiagnosticsConfirmationDuration(reduceMotion);");
    expect(screenSource).toContain("}, diagnosticsConfirmationDuration);");
    expect(screenSource).toContain("clearTimeout(diagnosticsExpiryTimerRef.current)");
    expect(screenSource).toContain("[diagnosticsCopied, diagnosticsConfirmationDuration]");
    expect(screenSource).toContain("diagnosticsExpiryTimerRef.current = null");
  });

  it("exposes an accessible retry action", () => {
    expect(screenSource).toContain("Retry ${failedExport.format.toUpperCase()} export");
    expect(screenSource).toContain("preserved selected rows and format");
  });
});
