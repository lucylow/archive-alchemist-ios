export const MAX_SAFE_AREA_INSET = 1_000;

export type SafeAreaInsetPayload = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function isValidSafeAreaInsets(
  payload: Record<string, unknown>,
): payload is SafeAreaInsetPayload {
  return (["top", "right", "bottom", "left"] as const).every((key) => {
    const value = payload[key];
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= MAX_SAFE_AREA_INSET
    );
  });
}
