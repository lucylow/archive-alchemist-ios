export type CachedUser = {
  id: number;
  role?: "user" | "admin";
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export function normalizeCachedUser(value: unknown): CachedUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<CachedUser> & { lastSignedIn?: Date | string | number };
  const id = candidate.id as number | undefined;
  if (typeof id !== "number" || !Number.isInteger(id) || typeof candidate.openId !== "string" || !candidate.openId) {
    return null;
  }

  const lastSignedIn = new Date(candidate.lastSignedIn ?? NaN);
  if (!Number.isFinite(lastSignedIn.getTime())) return null;

  return {
    id,
    role: candidate.role === "admin" ? "admin" : "user",
    openId: candidate.openId,
    name: typeof candidate.name === "string" ? candidate.name : null,
    email: typeof candidate.email === "string" ? candidate.email : null,
    loginMethod: typeof candidate.loginMethod === "string" ? candidate.loginMethod : null,
    lastSignedIn,
  };
}
