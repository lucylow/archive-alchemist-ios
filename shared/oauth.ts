export const MAX_OAUTH_USER_PARAM_LENGTH = 4_096;
export const MAX_OAUTH_SESSION_TOKEN_LENGTH = 4_096;

export function isSafeOAuthUserPayload(value: string | undefined): value is string {
  return Boolean(value && value.length <= MAX_OAUTH_USER_PARAM_LENGTH);
}

export function isSafeOAuthSessionToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_OAUTH_SESSION_TOKEN_LENGTH && value.trim() === value;
}
