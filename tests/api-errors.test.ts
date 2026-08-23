import { describe, expect, it } from "vitest";

import { normalizeApiError } from "../server/api-errors";

describe("API error normalization", () => {
  it("maps oversized payloads to a safe 413 response", () => {
    const error = Object.assign(new Error("secret request details"), {
      type: "entity.too.large",
    });

    expect(normalizeApiError(error)).toEqual({
      statusCode: 413,
      message: "Request payload is too large.",
      errorType: "Error",
    });
  });

  it("maps unexpected errors to a generic 500 response", () => {
    expect(normalizeApiError(new Error("database password must not escape"))).toEqual({
      statusCode: 500,
      message: "The server could not process this request.",
      errorType: "Error",
    });
  });

  it("uses unknown metadata for non-Error thrown values", () => {
    expect(normalizeApiError({ type: "unexpected", detail: "private" })).toEqual({
      statusCode: 500,
      message: "The server could not process this request.",
      errorType: "unknown",
    });
  });
});
