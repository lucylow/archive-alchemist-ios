import { describe, expect, it } from "vitest";

import {
  isWithinStorageLimit,
  MAX_HISTORY_STORAGE_LENGTH,
  MAX_MEMORY_STORAGE_LENGTH,
} from "../shared/storage-bounds";

describe("local storage payload bounds", () => {
  it("accepts values at or below the configured limit", () => {
    expect(isWithinStorageLimit("x".repeat(MAX_MEMORY_STORAGE_LENGTH), MAX_MEMORY_STORAGE_LENGTH)).toBe(true);
  });

  it("rejects values above the configured limit", () => {
    expect(isWithinStorageLimit("x".repeat(MAX_HISTORY_STORAGE_LENGTH + 1), MAX_HISTORY_STORAGE_LENGTH)).toBe(false);
  });
});
