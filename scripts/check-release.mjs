import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app.config.ts",
  "eas.json",
  "docs/APP_STORE_RELEASE.md",
  "assets/images/icon.png",
  "assets/images/splash-icon.png",
  "assets/images/favicon.png",
  "assets/images/android-icon-foreground.png",
  "assets/images/android-icon-background.png",
  "assets/images/android-icon-monochrome.png",
];
const assetFiles = requiredFiles.slice(3);
const forbiddenProductionPaths = ["app/dev"];
const sensitiveRootFilePatterns = [
  /^\.env(?:\.(?:local|development|preview|production))?$/i,
  /\.(?:pem|p8|key|mobileprovision|cer)$/i,
  /^credentials(?:\..*)?\.json$/i,
];
const approvedRouteFiles = new Set([
  "app/_layout.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/index.tsx",
  "app/oauth/callback.tsx",
  "app/admin/analytics.tsx",
]);
const synchronizedBrandingFiles = [
  "assets/images/icon.png",
  "assets/images/splash-icon.png",
  "assets/images/favicon.png",
  "assets/images/android-icon-foreground.png",
];
const pngSignature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const failures = [];

function getProductionApiConfigError(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "Production builds require EXPO_PUBLIC_API_BASE_URL to be set to a deployed HTTPS API origin";
  }
  const candidate = value.trim();
  if (candidate !== value) return "EXPO_PUBLIC_API_BASE_URL must not contain leading or trailing whitespace";

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL";
  }

  const hostname = url.hostname.toLowerCase();
  const octets = hostname.split(".").map(Number);
  const isPrivateIpv4 =
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
    (octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  const disallowedSuffixes = [".manus.computer", ".ngrok.io", ".ngrok-free.app", ".local", ".test", ".invalid"];

  if (url.protocol !== "https:") return "EXPO_PUBLIC_API_BASE_URL must use HTTPS in production";
  if (!hostname || hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || isPrivateIpv4) {
    return "EXPO_PUBLIC_API_BASE_URL must not target localhost or a private network in production";
  }
  if (disallowedSuffixes.some((suffix) => hostname.endsWith(suffix)) || hostname.includes("sandbox")) {
    return "EXPO_PUBLIC_API_BASE_URL must not target a sandbox, tunnel, or local development host in production";
  }
  if (url.username || url.password || url.search || url.hash) {
    return "EXPO_PUBLIC_API_BASE_URL must be an origin without credentials, query parameters, or fragments";
  }
  return null;
}
function collectRouteFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(absolutePath, relativePath));
    } else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(`app/${relativePath}`);
    }
  }
  return files;
}

const reportFailures = () => {
  if (failures.length === 0) return;
  console.error("Release preflight failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
};

for (const relativePath of requiredFiles) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) failures.push(`Missing ${relativePath}`);
}
reportFailures();

for (const relativePath of forbiddenProductionPaths) {
  if (existsSync(resolve(root, relativePath))) {
    failures.push(`Production build must not include development-only route path ${relativePath}`);
  }
}
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && sensitiveRootFilePatterns.some((pattern) => pattern.test(entry.name))) {
    failures.push(`Sensitive root file ${entry.name} must be removed before release`);
  }
}
for (const routeFile of collectRouteFiles(resolve(root, "app")).sort()) {
  if (!approvedRouteFiles.has(routeFile)) failures.push(`Unexpected Expo Router production route file ${routeFile}`);
}
reportFailures();

const appConfig = readFileSync(resolve(root, "app.config.ts"), "utf8");
let easConfig;
try {
  easConfig = JSON.parse(readFileSync(resolve(root, "eas.json"), "utf8"));
} catch {
  failures.push("eas.json is not valid JSON");
  reportFailures();
}

for (const expected of [
  "Archive Alchemist",
  "com.archivealchemist.mobile",
  'version: "1.0.0"',
  "NSPrivacyAccessedAPICategoryUserDefaults",
  'NSPrivacyAccessedAPITypeReasons: ["CA92.1"]',
  'ITSAppUsesNonExemptEncryption": false',
  'icon: "./assets/images/icon.png"',
  'image: "./assets/images/splash-icon.png"',
  'favicon: "./assets/images/favicon.png"',
  'foregroundImage: "./assets/images/android-icon-foreground.png"',
  'backgroundImage: "./assets/images/android-icon-background.png"',
  'monochromeImage: "./assets/images/android-icon-monochrome.png"',
]) {
  if (!appConfig.includes(expected)) failures.push(`app.config.ts does not contain ${expected}`);
}
const logoUrlMatch = appConfig.match(/logoUrl:\s*["']([^"']*)["']/);
if (!logoUrlMatch || !logoUrlMatch[1].trim() || /placeholder|to_be_replaced/i.test(logoUrlMatch[1])) {
  failures.push("app.config.ts must declare a non-placeholder generated logoUrl");
}
if (!/version:\s*["']\d+\.\d+\.\d+["']/.test(appConfig)) {
  failures.push("app.config.ts must declare a semantic version such as version: \"1.0.0\"");
}
const buildNumberMatch = appConfig.match(/buildNumber:\s*["']([^"']+)["']/);
if (!buildNumberMatch || !/^[1-9]\d*$/.test(buildNumberMatch[1])) {
  failures.push("app.config.ts must declare a positive numeric iOS buildNumber");
}
for (const profile of ["development", "preview", "production"]) {
  if (!easConfig.build?.[profile]) failures.push(`eas.json is missing the ${profile} build profile`);
}
if (process.env.EAS_BUILD_PROFILE === "production") {
  const apiConfigError = getProductionApiConfigError(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (apiConfigError) failures.push(apiConfigError);
}
if (easConfig.build?.production?.distribution !== "store") {
  failures.push('eas.json production profile must use "store" distribution');
}
if (easConfig.build?.production?.ios?.simulator !== false) {
  failures.push("eas.json production iOS build must set simulator to false");
}

for (const forbidden of ["expo-audio", "expo-video", "expo-notifications", "POST_NOTIFICATIONS"]) {
  if (appConfig.includes(forbidden)) {
    failures.push(`app.config.ts contains unused native capability ${forbidden}`);
  }
}

const assetHashes = new Map();
for (const relativePath of assetFiles) {
  const absolutePath = resolve(root, relativePath);
  const stats = lstatSync(absolutePath);
  if (!stats.isFile()) {
    failures.push(`${relativePath} is not a regular file`);
    continue;
  }

  const contents = readFileSync(absolutePath);
  const signature = contents.subarray(0, pngSignature.length);
  const hasPngSignature =
    signature.length === pngSignature.length && pngSignature.every((byte, index) => signature[index] === byte);
  if (!hasPngSignature) failures.push(`${relativePath} is not a valid PNG file`);
  if (stats.size > 1024 * 1024) failures.push(`${relativePath} is larger than 1 MB (${stats.size} bytes)`);
  assetHashes.set(relativePath, createHash("sha256").update(contents).digest("hex"));
}

const primaryBrandingHash = assetHashes.get(synchronizedBrandingFiles[0]);
if (primaryBrandingHash) {
  for (const relativePath of synchronizedBrandingFiles.slice(1)) {
    if (assetHashes.get(relativePath) !== primaryBrandingHash) {
      failures.push(`${relativePath} does not match assets/images/icon.png`);
    }
  }
}

reportFailures();

console.log("Release preflight passed.");
console.log("Bundle ID: com.archivealchemist.mobile");
console.log("Profiles: development, preview, production");
console.log("Note: replace eas.json submit.production.ios.ascAppId after creating the App Store Connect record.");
