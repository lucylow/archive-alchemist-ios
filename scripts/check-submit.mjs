import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const configFlagIndex = args.indexOf("--config");
const configPath =
  configFlagIndex >= 0 && args[configFlagIndex + 1]
    ? args[configFlagIndex + 1]
    : fileURLToPath(new URL("../eas.json", import.meta.url));

let issue;
let easConfig;

if (!existsSync(configPath)) {
  issue = `EAS configuration file was not found at ${configPath}.`;
} else {
  try {
    easConfig = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    issue = "eas.json is not valid JSON; fix the file before submitting.";
  }
}

if (!issue) {
  const ascAppId = easConfig?.submit?.production?.ios?.ascAppId;
  const isConfigured = typeof ascAppId === "string" && /^\d{6,12}$/.test(ascAppId);
  if (!isConfigured) {
    issue = "set eas.json submit.production.ios.ascAppId to the numeric App Store Connect App ID.";
  }
}

if (issue) {
  console.error(`App Store submission preflight blocked: ${issue}`);
  if (strict) process.exitCode = 1;
} else {
  console.log("App Store submission preflight passed: App Store Connect ID is configured.");
}
