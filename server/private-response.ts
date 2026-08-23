export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

export function markPrivateResponse(res: {
  set(field: string, value: string): unknown;
}): void {
  res.set("Cache-Control", PRIVATE_RESPONSE_HEADERS["Cache-Control"]);
  res.set("Pragma", PRIVATE_RESPONSE_HEADERS.Pragma);
}

