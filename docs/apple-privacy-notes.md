# Apple Privacy Manifest Notes

The Expo privacy-manifest guide documents that an iOS privacy manifest can be configured through `expo.ios.privacyManifests`, including `NSPrivacyAccessedAPITypes`. For UserDefaults, the documented shape uses `NSPrivacyAccessedAPIType: NSPrivacyAccessedAPICategoryUserDefaults` and reason `CA92.1`.

Apple's required-reason API documentation states that covered API use must be declared with approved reasons in the app or SDK privacy manifest, and that the reasons must accurately match the app's functionality.

Sources:

- Expo, “Privacy manifests”: https://docs.expo.dev/guides/apple-privacy/
- Apple Developer, “Describing use of required reason API”: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
