import { describe, expect, it } from "vitest";

import {
  readStorageValue,
  removeStorageValue,
  writeRequiredStorageValue,
  writeStorageValue,
} from "../lib/_core/storage-safety";

describe("storage safety helpers", () => {
  it("returns null when a storage read fails", async () => {
    await expect(readStorageValue(async () => {
      throw new Error("read failed");
    })).resolves.toBeNull();
  });

  it("preserves required write failures for session-token callers", async () => {
    const failure = new Error("write failed");
    await expect(writeRequiredStorageValue(async () => {
      throw failure;
    })).rejects.toBe(failure);
  });

  it("swallows best-effort cache write failures", async () => {
    await expect(writeStorageValue(async () => {
      throw new Error("cache write failed");
    })).resolves.toBeUndefined();
  });

  it("swallows cleanup failures", async () => {
    await expect(removeStorageValue(async () => {
      throw new Error("cleanup failed");
    })).resolves.toBeUndefined();
  });
});
