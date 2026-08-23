# Project TODO

- [x] Mobile home screen with archive overview and Mind memory status
- [x] Source platform selection flow
- [x] Archive scan progress with selected-platform scope
- [x] Dormant-gold discovery list and detail actions
- [x] Platform-aware repurposing review flow
- [x] Per-output approval and Approve All behavior
- [x] Persistent Mind memory with continuity checkpoint
- [x] Autonomous follow-up results screen
- [x] Local settings and demo-memory reset
- [x] Archive Alchemist brand theme and iOS icon assets
- [x] Expo app configuration and stable iOS bundle identifier
- [x] EAS build profiles and App Store release metadata
- [x] Unit tests for persistence and approval rules
- [x] Typecheck, lint, and Expo export verification
- [x] App Store listing copy, privacy notes, and screenshot checklist
- [x] Apple Developer signing and App Store Connect handoff instructions
- [x] Resilient Mind-memory save flow with duplicate-tap protection and fresh review state
- [x] One-handed back navigation across every workflow phase
- [x] Persisted source-platform preferences across app launches
- [x] VoiceOver labels for overview metrics and discovery cards
- [x] Hydration gate to prevent first-launch state flicker
- [x] Human-readable Mind-memory timestamp on the overview
- [x] Confirmed destructive reset for local Mind memory
- [x] Select All and Clear All controls for source onboarding
- [x] Bounded hydration timeout to avoid an indefinite startup screen
- [x] Final App Store release configuration audit
- [x] Final iOS metadata and EAS handoff hardening
- [x] Final Expo release verification after handoff updates
- [x] Final Apple submission checkpoint
- [x] Reproducible Expo/App Store release preflight script
- [x] Polished native splash fade and branded hydration loading animation
- [x] Resume the last saved Mind workflow from the home overview
- [x] Show the saved source-platform mix in the home Mind-memory summary
- [x] Respect iOS Reduce Motion settings in the startup animation
- [x] Add VoiceOver hints to resume and destructive memory actions
- [x] Add VoiceOver labels and hints to platform selection and output approval controls
- [x] Harden local hydration so malformed Mind memory is discarded without deleting valid platform preferences
- [x] Expose archive scan progress and per-platform scan status clearly to VoiceOver
- [x] Explain why disabled primary workflow actions are unavailable to VoiceOver users
- [x] Make workflow status notices announce their message and dismissal action clearly
- [x] Announce each workflow phase transition to VoiceOver after hydration
- [x] Persist and display a compact local history of recent Mind workflows
- [x] Add a typed server-side Minds agent endpoint with structured discovery recommendations
- [x] Harden Minds response parsing for fenced JSON, empty content, and structured validation failures
- [x] Persist validated Minds recommendations with the saved workflow and recent history
- [x] Add an accessible action to reopen a saved workflow and its Minds insight
- [x] Add an accessible retry action after a Minds analysis failure
- [x] Add one bounded automatic retry for transient Minds analysis failures
- [x] Refactor history persistence out of the React state updater for deterministic Mind saves
- [x] Automatically persist a newly generated Minds insight into the active saved workflow
- [x] Extract and test the pure Minds-memory merge logic used by automatic persistence
- [x] Clear stale Minds insight state before starting a new analysis request
- [x] Add a bounded server-side timeout for Minds LLM analysis requests
- [x] Show timeout-specific Minds guidance and retry instructions in the mobile client
- [x] Extract and test the Minds client error-message normalization for reliable timeout guidance
- [x] Add cancel semantics that suppress late Minds responses and clear pending analysis state
- [x] Guard the Minds request handler against duplicate submissions outside the disabled UI state
- [x] Extract and test the pure Minds request-start guard used by the mobile handler
- [x] Retry only transient Minds failures instead of repeating validation and structured-output errors
- [x] Expose the Minds analysis busy state explicitly to assistive technologies
- [x] Invalidate in-flight Minds callbacks when the user leaves the discoveries phase
- [x] Extract and test the Minds request lifecycle gate for cancellation and late-response suppression
- [x] Cover repeated cancellation and navigation invalidation in the Minds lifecycle gate tests
- [x] Cover uppercase, string, and non-transient Minds retry-classification inputs
- [x] Inspect structured error codes when classifying transient Minds failures
- [x] Treat structured HTTP 408 request-timeout responses as retryable Minds failures
- [x] Show timeout-specific guidance for structured Minds timeout codes in the mobile client
- [x] Add deterministic tests for Minds request-state reset and stale-insight prevention
- [x] Add a conservative authenticated per-user daily Minds usage limit with deterministic quota tests
- [x] Persist authenticated Minds daily quota counters in the database with a safe fallback
- [x] Add privacy-conscious durable Minds request analytics without storing user content
- [x] Record bounded client retry attempts in durable Minds analytics
- [x] Prevent concurrent authenticated Minds quota reservations from undercounting usage
- [x] Show remaining daily Minds analyses before the user starts an analysis
- [x] Prevent hidden React Query retries from duplicating the explicit Minds retry
- [x] Add query indexes for user-scoped and outcome/time-based Minds analytics
- [x] Bound Minds analytics retention to a privacy-safe rolling window
- [x] Add an admin-only aggregated Minds analytics summary endpoint
- [x] Add normalized Minds success/retry rates and explicit summary outage handling
- [x] Add authorization regression tests for the admin-only Minds analytics summary
- [x] Cover the authorized administrator path and safe analytics-storage outage response
- [x] Normalize malformed Minds analytics metrics to finite non-negative values
- [x] Sanitize Minds analytics event metrics before database persistence
- [x] Allowlist Minds analytics error codes before database persistence
- [x] Declare iOS required-reason API usage for local persistence in the privacy manifest
- [x] Bound Minds archive payload size before LLM analysis
- [x] Add an administrator-only mobile Minds analytics screen with accessible loading and error states
- [x] Expose typed user roles and show an administrator-only analytics entry point
- [x] Add accessible 1-, 7-, and 30-day selection to the admin Minds analytics screen
- [x] Add previous-window comparisons to the admin Minds analytics summary
- [x] Enable and verify the authentication logout regression test instead of leaving it skipped
- [x] Remove sensitive OAuth callback logging and keep authentication diagnostics metadata-only
- [x] Remove user profile and exception payloads from auth hook diagnostics
- [x] Align OAuth deep-link scheme derivation with the production bundle identifier
- [x] Handle native auth-cache read failures without leaving startup hydration unresolved
- [x] Handle rejected OAuth URL capability checks without unhandled login promises
- [x] Remove leftover theme-provider debug logging from the production bundle
- [x] Make server database and quota diagnostics metadata-only
- [x] Make server OAuth and session diagnostics metadata-only
- [x] Make SDK session verification and OAuth sync diagnostics metadata-only
- [x] Make owner-notification diagnostics metadata-only
- [x] Make storage proxy diagnostics metadata-only
- [x] Make API startup failure diagnostics metadata-only
- [x] Restrict credentialed API CORS responses to trusted application origins
- [x] Bound API request body parsing to a workflow-appropriate size limit
- [x] Add deterministic tests for trusted-origin CORS boundaries
- [x] Use secure-compatible SameSite cookies for local HTTP and production HTTPS
- [x] Remove upstream response bodies from LLM error surfaces
- [x] Mark authentication and OAuth session responses as no-store
- [x] Add deterministic coverage for private authentication response headers
- [x] Return sanitized JSON for parser and unhandled API request errors
- [x] Add deterministic tests for sanitized 413 and 500 API error responses
- [x] Validate the API startup port environment value with a safe fallback
- [x] Add deterministic security headers to API responses
- [x] Reduce verbose OAuth callback diagnostics to essential metadata-only events
- [x] Consolidate repetitive auth-hook diagnostics to essential metadata-only events
- [x] Bound OAuth callback profile payload decoding to a safe parameter size
- [x] Make client API transport diagnostics metadata-only and bound error parsing
- [x] Remove unused audio/video native capabilities and permission declarations from the iOS release build

- [x] Remove unused notification capability and Android notification permission from the release build

- [x] Prevent OAuth login crashes when required public configuration is missing or malformed

- [x] Disable Manus runtime debug logging in production builds

- [x] Validate preview safe-area messages by source and bounded finite inset values

- [x] Extend release preflight to reject unused native capability and permission declarations

- [x] Prevent rapid duplicate Auto-Post taps from writing the same workflow more than once

- [x] Announce Auto-Post persistence busy state to assistive technologies

- [x] Require iOS privacy manifest and encryption declarations in release preflight

- [x] Bound local Mind hydration payloads before JSON parsing

- [x] Remove oversized persisted Mind keys after detecting them during startup hydration

- [x] Explain local-memory recovery when corrupted or oversized persisted data is discarded

- [x] Add a dedicated App Store submission preflight for unresolved App Store Connect metadata

- [x] Document the strict App Store submission preflight in the release guide

- [x] Make workflow status notices accessible with a separate dismiss action

- [x] Preserve partial-save warnings instead of replacing them with a misleading Auto-Post success message

- [x] Add pure, deterministic coverage for Auto-Post persistence result messaging

- [x] Require all configured Android adaptive icon assets in release preflight

