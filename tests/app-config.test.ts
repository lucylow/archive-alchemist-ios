import { describe, expect, it } from "vitest";

import config from "../app.config";

describe("iOS App Store privacy configuration", () => {
  it("declares the UserDefaults required-reason API for local persistence", () => {
    const apiTypes = config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes;
    expect(apiTypes).toContainEqual({
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
      NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
    });
  });
});

