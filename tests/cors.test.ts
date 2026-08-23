import { describe, expect, it } from "vitest";

import {
  getTrustedCorsOrigins,
  isCorsPreflightAllowed,
  isTrustedCorsOrigin,
  normalizeCorsOrigin,
} from "../server/cors";

describe("trusted CORS origins", () => {
  it("normalizes valid URLs to their origin and rejects malformed values", () => {
    expect(normalizeCorsOrigin("https://preview.example.com/path?x=1")).toBe(
      "https://preview.example.com",
    );
    expect(normalizeCorsOrigin("not a URL")).toBeNull();
    expect(normalizeCorsOrigin(undefined)).toBeNull();
  });

  it("includes local development and configured preview origins", () => {
    const origins = getTrustedCorsOrigins(
      "https://preview.example.com/app",
      "https://proxy.example.com/",
    );

    expect(origins).toEqual(
      new Set([
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "https://preview.example.com",
        "https://proxy.example.com",
      ]),
    );
  });

  it("accepts only exact trusted origins and rejects untrusted preflights", () => {
    const origins = getTrustedCorsOrigins("https://preview.example.com");

    expect(isTrustedCorsOrigin("https://preview.example.com", origins)).toBe(true);
    expect(isTrustedCorsOrigin("https://preview.example.com.attacker.test", origins)).toBe(false);
    expect(isTrustedCorsOrigin(undefined, origins)).toBe(false);
    expect(isCorsPreflightAllowed(undefined, origins)).toBe(true);
    expect(isCorsPreflightAllowed("https://unknown.example.com", origins)).toBe(false);
  });
});
