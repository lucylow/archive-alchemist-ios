# Archive Alchemist — Apple App Store Release Handoff

## Current release configuration

The Expo project is configured as **Archive Alchemist**, version `1.0.0`, portrait-only, with the iOS bundle identifier `com.archivealchemist.mobile` and build number `1`. If this identifier is already claimed, change `rawBundleId` in `app.config.ts` before creating the first production build; after the first App Store build, keep the identifier permanently stable.

The app uses local device storage for demo Mind memory and does not require an account, external API key, or server-side credential for the current submission build. The iOS configuration declares that the app does not use non-exempt encryption.

## Apple prerequisites

Before the production build, the owner must have an active Apple Developer Program membership, access to App Store Connect, and an application record created with the exact bundle identifier. The App Store Connect app record should use the display name **Archive Alchemist**, primary language English, category **Photo & Video** or **Productivity**, and age rating answers consistent with a creator productivity tool.

The app currently does not request camera, microphone, contacts, location, photo library, or notification permissions. If those capabilities are added later, add the matching purpose strings and review them against Apple’s privacy requirements before submission.

## EAS commands

Run these commands from the project root after installing or authenticating the EAS CLI:

```bash
npx eas login
npx eas project:init
npx eas build:configure
npx eas build --platform ios --profile preview
npx eas submit --platform ios --profile production
```

For a production archive intended for the App Store, use:

```bash
npx eas build --platform ios --profile production
```

When EAS prompts for credentials, allow EAS to manage distribution certificates and provisioning profiles unless the organization requires manually managed credentials. The first build will create or link the iOS application using the configured bundle identifier.

Update `ascAppId` in `eas.json` with the numeric App Store Connect app ID before using the automated submit profile. If it is not available yet, upload the generated `.ipa` through Transporter or the App Store Connect web interface.

## Suggested App Store listing copy

### Subtitle

Turn dormant archives into your next release.

### Promotional text

Archive Alchemist remembers your creative context, finds overlooked work, and turns it into a platform-ready publishing plan.

### Description

Archive Alchemist is a creator workspace for finding new life in the work you have already made. Select the source platforms you want to scan, review the dormant-gold discoveries, and choose the outputs that fit your publishing mix.

The app keeps your workflow coherent from archive scan to repurposing review. You can approve outputs individually or approve a complete batch before scheduling. After publishing, the Conductor preserves a local Mind memory and surfaces an autonomous follow-up recommendation so your next move is ready when you return.

Archive Alchemist is designed for fast, focused review. It does not require an account for the demo workflow and stores its continuity checkpoint locally on your device.

### Keywords

creator archive, content repurposing, creative workflow, content planning, publishing ideas, creator tools, video workflow

## Privacy and review notes

The current build uses deterministic demo content and local AsyncStorage for the Mind continuity checkpoint. No user content is uploaded by this release. The app can be reviewed without signing in: open the app, tap **Start a new dig**, select platforms, complete the scan, approve outputs, and tap **Auto-Post**.

For App Review, explain that **Auto-Post** is a simulated scheduling action in the hackathon demonstration build. It records the selected workflow locally and displays a results state; it does not publish to third-party accounts. If real integrations are added later, replace this note with the actual OAuth, data collection, and account-deletion behavior.

## Screenshot checklist

Capture portrait screenshots on a current iPhone simulator or device showing the Home overview, Connect Sources, Dormant Gold, Repurpose Review with approvals, and Seven Days Later autonomous follow-up. Use the same brand palette and avoid showing debug overlays, development URLs, or placeholder account data.

## Release acceptance checklist

| Check | Status |
| --- | --- |
| Expo app name and icon configured | Complete |
| Stable iOS bundle identifier configured | Complete |
| Portrait orientation configured | Complete |
| EAS development, preview, and production profiles | Complete |
| App Store Connect app record | Owner action required |
| Apple signing credentials | Owner action required at first EAS build |
| `ascAppId` in `eas.json` | Owner action required |
| Production EAS build | Pending Apple credentials |
| TestFlight smoke test | Pending production or preview build |
| App Store review submission | Owner action required |
