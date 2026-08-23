export type MindsFailureCode = "TIMEOUT" | "NETWORK" | "STRUCTURED_OUTPUT" | "UPSTREAM";

export function classifyMindsFailure(error: unknown): MindsFailureCode {
  const message = (() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      const record = error as Record<string, unknown>;
      return [record.message, record.code]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
    }
    return String(error);
  })().toLowerCase();

  if (["timed out", "timeout", "408"].some((signal) => message.includes(signal))) return "TIMEOUT";
  if (["network", "fetch"].some((signal) => message.includes(signal))) return "NETWORK";
  if (["structured", "json", "schema"].some((signal) => message.includes(signal))) return "STRUCTURED_OUTPUT";
  return "UPSTREAM";
}

export function clampMindsDurationMs(durationMs: number): number {
  return Math.max(0, Math.min(Math.round(durationMs), 2_147_483_647));
}
