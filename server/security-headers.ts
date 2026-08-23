export const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

export function applyApiSecurityHeaders(res: {
  set(field: string, value: string): unknown;
}): void {
  for (const [field, value] of Object.entries(API_SECURITY_HEADERS)) {
    res.set(field, value);
  }
}

