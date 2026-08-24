export const MAX_OAUTH_USER_PARAM_LENGTH = 4_096;

export function isSafeOAuthUserPayload(value: string | undefined): value is string {
  return Boolean(value && value.length <= MAX_OAUTH_USER_PARAM_LENGTH);
}

