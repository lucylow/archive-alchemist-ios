import { describe, expect, it, vi } from "vitest";

import { withTimeout } from "../lib/_core/with-timeout";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("withTimeout", () => {
  it("returns the fallback when the promise exceeds the timeout", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<string>();
      const result = withTimeout(pending.promise, "fallback", 1500);
      await vi.advanceTimersByTimeAsync(1500);
      await expect(result).resolves.toBe("fallback");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the timeout when the promise resolves first", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<string>();
      const result = withTimeout(pending.promise, "fallback", 1500);
      pending.resolve("saved");
      await expect(result).resolves.toBe("saved");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the timeout and propagates storage rejection", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<string>();
      const result = withTimeout(pending.promise, "fallback", 1500);
      const error = new Error("storage unavailable");
      pending.reject(error);
      await expect(result).rejects.toBe(error);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
