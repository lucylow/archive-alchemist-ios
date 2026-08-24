import { readFileSync } from "node:fs";

const easConfig = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
const ascAppId = easConfig.submit?.production?.ios?.ascAppId;
const isConfigured = typeof ascAppId === "string" && /^\d{6,12}$/.test(ascAppId);

if (!isConfigured) {
  console.error("App Store submission preflight blocked: set eas.json submit.production.ios.ascAppId to the numeric App Store Connect App ID.");
  process.exit(process.argv.includes("--strict") ? 1 : 0);
}

console.log("App Store submission preflight passed: App Store Connect ID is configured.");
