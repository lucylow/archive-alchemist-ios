import { existsSync, lstatSync, readFileSync, statSync } from "node:fs";
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
const pngSignature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const failures = [];
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
]) {
  if (!appConfig.includes(expected)) failures.push(`app.config.ts does not contain ${expected}`);
}
for (const profile of ["development", "preview", "production"]) {
  if (!easConfig.build?.[profile]) failures.push(`eas.json is missing the ${profile} build profile`);
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

for (const relativePath of assetFiles) {
  const absolutePath = resolve(root, relativePath);
  const stats = lstatSync(absolutePath);
  if (!stats.isFile()) {
    failures.push(`${relativePath} is not a regular file`);
    continue;
  }

  const signature = readFileSync(absolutePath).subarray(0, pngSignature.length);
  const hasPngSignature =
    signature.length === pngSignature.length && pngSignature.every((byte, index) => signature[index] === byte);
  if (!hasPngSignature) failures.push(`${relativePath} is not a valid PNG file`);
  if (stats.size > 1024 * 1024) failures.push(`${relativePath} is larger than 1 MB (${stats.size} bytes)`);
}

reportFailures();

console.log("Release preflight passed.");
console.log("Bundle ID: com.archivealchemist.mobile");
console.log("Profiles: development, preview, production");
console.log("Note: replace eas.json submit.production.ios.ascAppId after creating the App Store Connect record.");
