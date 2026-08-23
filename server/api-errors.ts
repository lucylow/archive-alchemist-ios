export type SafeApiErrorResponse = {
  statusCode: 413 | 500;
  message: "Request payload is too large." | "The server could not process this request.";
  errorType: string;
};

export function normalizeApiError(error: unknown): SafeApiErrorResponse {
  const errorType = error instanceof Error ? error.name : "unknown";
  const isPayloadTooLarge =
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large";

  return isPayloadTooLarge
    ? {
        statusCode: 413,
        message: "Request payload is too large.",
        errorType,
      }
    : {
        statusCode: 500,
        message: "The server could not process this request.",
        errorType,
      };
}

