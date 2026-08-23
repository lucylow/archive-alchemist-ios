const MINDS_TIMEOUT_NOTICE =
  "Minds took too long to respond. Try again when your connection is ready; your local workflow is still available.";
const MINDS_GENERIC_NOTICE = "Minds could not analyze this item right now. Your local workflow is still available.";
const MINDS_ANALYZING_NOTICE = "Minds is analyzing this archive item. Your previous recommendation has been cleared.";

export function getMindsRequestStartNotice(): string {
  return MINDS_ANALYZING_NOTICE;
}

function getMindsErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nestedData = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : undefined;
    return [record.message, record.code, nestedData?.message, nestedData?.code]
      .filter((value): value is string => typeof value === "string")
      .join(" ");
  }
  return String(error);
}

export function getMindsErrorNotice(error: unknown): string {
  const message = getMindsErrorText(error);
  return ["timed out", "timeout", "408"].some((signal) => message.toLowerCase().includes(signal))
    ? MINDS_TIMEOUT_NOTICE
    : MINDS_GENERIC_NOTICE;
}

export function shouldRetryMindsError(error: unknown): boolean {
  const message = getMindsErrorText(error).toLowerCase();
  return ["timed out", "timeout", "network", "fetch", "408", "429", "502", "503", "504"].some((signal) => message.includes(signal));
}
