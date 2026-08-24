const DISALLOWED_HOST_SUFFIXES = [
  ".manus.computer",
  ".ngrok.io",
  ".ngrok-free.app",
  ".local",
  ".test",
  ".invalid",
];

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

export function getProductionApiConfigError(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return "Production builds require EXPO_PUBLIC_API_BASE_URL to be set to a deployed HTTPS API origin";
  }

  const candidate = value.trim();
  if (candidate !== value) {
    return "EXPO_PUBLIC_API_BASE_URL must not contain leading or trailing whitespace";
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL";
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") {
    return "EXPO_PUBLIC_API_BASE_URL must use HTTPS in production";
  }
  if (!hostname || hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || isPrivateIpv4(hostname)) {
    return "EXPO_PUBLIC_API_BASE_URL must not target localhost or a private network in production";
  }
  if (DISALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) || hostname.includes("sandbox")) {
    return "EXPO_PUBLIC_API_BASE_URL must not target a sandbox, tunnel, or local development host in production";
  }
  if (url.username || url.password || url.search || url.hash) {
    return "EXPO_PUBLIC_API_BASE_URL must be an origin without credentials, query parameters, or fragments";
  }

  return null;
}
