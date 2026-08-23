const LOCAL_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081"];

export function normalizeCorsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getTrustedCorsOrigins(
  previewUrl?: string,
  packagerProxyUrl?: string,
): ReadonlySet<string> {
  return new Set(
    [
      ...LOCAL_ORIGINS,
      normalizeCorsOrigin(previewUrl),
      normalizeCorsOrigin(packagerProxyUrl),
    ].filter((origin): origin is string => Boolean(origin)),
  );
}

export function isTrustedCorsOrigin(
  origin: string | undefined,
  trustedOrigins: ReadonlySet<string>,
): boolean {
  return Boolean(origin && trustedOrigins.has(origin));
}

export function isCorsPreflightAllowed(
  origin: string | undefined,
  trustedOrigins: ReadonlySet<string>,
): boolean {
  return !origin || isTrustedCorsOrigin(origin, trustedOrigins);
}

