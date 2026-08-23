import { describe, expect, it } from "vitest";

import {
  getMindsErrorNotice,
  getMindsRequestStartNotice,
  shouldRetryMindsError,
} from "../lib/minds-notices";

describe("Minds request notices", () => {
  it("announces a fresh analysis and cleared prior recommendation", () => {
    expect(getMindsRequestStartNotice()).toContain("previous recommendation has been cleared");
  });

  it("returns actionable guidance for timeout failures", () => {
    expect(getMindsErrorNotice(new Error("Minds analysis timed out"))).toContain("Try again");
  });

  it("uses a safe fallback for unknown failures", () => {
    expect(getMindsErrorNotice({ message: "internal details" })).toBe(
      "Minds could not analyze this item right now. Your local workflow is still available.",
    );
  });

  it("classifies transient failures as retryable", () => {
    expect(shouldRetryMindsError(new Error("Minds analysis timed out"))).toBe(true);
    expect(shouldRetryMindsError(new Error("503 service unavailable"))).toBe(true);
  });

  it("does not retry structured validation failures", () => {
    expect(shouldRetryMindsError(new Error("Minds returned invalid structured output"))).toBe(false);
  });

  it("handles uppercase and string transient errors", () => {
    expect(shouldRetryMindsError(new Error("NETWORK request failed"))).toBe(true);
    expect(shouldRetryMindsError("502 gateway error")).toBe(true);
  });

  it("does not retry unrelated non-error values", () => {
    expect(shouldRetryMindsError(null)).toBe(false);
    expect(shouldRetryMindsError({ code: "SCHEMA_INVALID" })).toBe(false);
  });

  it("recognizes structured transient transport codes", () => {
    expect(shouldRetryMindsError({ data: { code: "503" } })).toBe(true);
    expect(shouldRetryMindsError({ code: "TIMEOUT" })).toBe(true);
    expect(shouldRetryMindsError({ code: "408" })).toBe(true);
  });

  it("uses timeout guidance for a structured 408 failure", () => {
    expect(getMindsErrorNotice({ code: "408" })).toContain("Try again");
  });
});
