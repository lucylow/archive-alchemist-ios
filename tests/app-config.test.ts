import { describe, expect, it } from "vitest";

import config from "../app.config";
import { getDeepLinkScheme } from "../shared/const";

describe("iOS App Store privacy configuration", () => {
  it("derives the OAuth deep-link scheme from the production bundle identifier", () => {
    expect(config.scheme).toBe(getDeepLinkScheme("com.archivealchemist.mobile"));
    expect(getDeepLinkScheme("com.archivealchemist.mobile")).toBe("manusmobile");
  });

  it("declares the UserDefaults required-reason API for local persistence", () => {
    const apiTypes = config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes;
    expect(apiTypes).toContainEqual({
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
      NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
    });
  });
});

