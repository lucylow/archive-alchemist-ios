export const MAX_API_ERROR_BODY_LENGTH = 4_096;

export function normalizeClientApiError(
  body: string,
  statusCode: number,
  statusText: string,
): string {
  const boundedBody = body.slice(0, MAX_API_ERROR_BODY_LENGTH);
  try {
    const parsed = JSON.parse(boundedBody) as { error?: unknown; message?: unknown };
    const candidate =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
          ? parsed.message
          : null;
    if (candidate) {
      return candidate.slice(0, MAX_API_ERROR_BODY_LENGTH);
    }
  } catch {
    // Fall through to a stable status-based message for non-JSON bodies.
  }

  return `API request failed (${statusCode}${statusText ? ` ${statusText}` : ""}).`;
}

