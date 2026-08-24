export const MAX_OAUTH_USER_PARAM_LENGTH = 4_096;
export const MAX_OAUTH_SESSION_TOKEN_LENGTH = 4_096;
export const MAX_OAUTH_CODE_LENGTH = 4_096;
export const MAX_OAUTH_STATE_LENGTH = 1_024;

function isSafeOAuthParameter(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && value.trim() === value;
}

export function isSafeOAuthUserPayload(value: string | undefined): value is string {
  return Boolean(value && value.length <= MAX_OAUTH_USER_PARAM_LENGTH);
}

export function isSafeOAuthSessionToken(value: unknown): value is string {
  return isSafeOAuthParameter(value, MAX_OAUTH_SESSION_TOKEN_LENGTH);
}

export function isSafeOAuthCode(value: unknown): value is string {
  return isSafeOAuthParameter(value, MAX_OAUTH_CODE_LENGTH);
}

export function isSafeOAuthState(value: unknown): value is string {
  return isSafeOAuthParameter(value, MAX_OAUTH_STATE_LENGTH);
}
