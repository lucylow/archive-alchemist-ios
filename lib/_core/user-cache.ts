export type CachedUser = {
  id: number;
  role?: "user" | "admin";
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

const MAX_OPEN_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320;
const MAX_LOGIN_METHOD_LENGTH = 64;

function optionalBoundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

export function normalizeCachedUser(value: unknown): CachedUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<CachedUser> & { lastSignedIn?: Date | string | number };
  const id = candidate.id as number | undefined;
  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    typeof candidate.openId !== "string" ||
    !candidate.openId ||
    candidate.openId.length > MAX_OPEN_ID_LENGTH
  ) {
    return null;
  }

  const lastSignedIn = new Date(candidate.lastSignedIn ?? NaN);
  if (!Number.isFinite(lastSignedIn.getTime())) return null;

  return {
    id,
    role: candidate.role === "admin" ? "admin" : "user",
    openId: candidate.openId,
    name: optionalBoundedString(candidate.name, MAX_NAME_LENGTH),
    email: optionalBoundedString(candidate.email, MAX_EMAIL_LENGTH),
    loginMethod: optionalBoundedString(candidate.loginMethod, MAX_LOGIN_METHOD_LENGTH),
    lastSignedIn,
  };
}
