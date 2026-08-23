export function buildOAuthLoginUrl(
  portalUrl: string,
  appId: string,
  redirectUri: string,
  state: string,
): string | null {
  if (!portalUrl || !appId || !redirectUri || !state) return null;

  try {
    const url = new URL(`${portalUrl.replace(/\/$/, "")}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return null;
  }
}
