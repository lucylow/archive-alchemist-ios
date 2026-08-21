# Archive Alchemist iOS — Interface Design Plan

## Product direction

Archive Alchemist is a first-party-feeling iOS workspace for creators who want to turn dormant archive material into a platform-aware publishing queue. The mobile experience prioritizes one-handed review, clear progress feedback, and fast approval of generated outputs.

The visual language uses deep indigo surfaces, warm alchemist gold accents, rounded cards, restrained motion, and strong hierarchy. The app is designed for portrait orientation and supports short sessions: a creator can check discoveries, approve a batch, and review autonomous follow-up recommendations in under two minutes.

## Screen list

| Screen | Primary content and functionality |
| --- | --- |
| Home / Archive Overview | Greeting, memory status, archive totals, dormant-gold count, top discovery, active Mind roles, and the primary “Start a dig” action. |
| Connect Sources | Selectable platform cards for YouTube, Spotify, Substack, Twitter, Instagram, and TikTok. Shows selected count and prevents starting with no source. |
| Scan Progress | Connected-platform scope, animated progress, per-platform ingestion results, and a clear continuation action once the scan is ready. |
| Discoveries | Ranked dormant-gold cards with title, year, Evergreen Score, source views, and actions for repurpose, schedule, or original context. |
| Repurpose Review | Platform-specific output list for the selected distribution mix. Supports per-output approval, Approve All, Review First, and Auto-Post. |
| Results / Follow-up | Seven-day performance cards, platform breakdown, autonomous follow-up recommendation, and continuity checkpoint showing what the Mind remembers. |
| Settings | Local demo memory reset, notification preference placeholder with a clear unavailable state, privacy copy, and app version. |

## Primary content model

The app uses deterministic demo data for reliable judging. The core domain objects are `Platform`, `ArchiveItem`, `MindMemory`, `RepurposeOutput`, and `PerformanceSnapshot`. `MindMemory` stores the last autonomous workflow, selected platform count, timestamp, and learned output preference so continuity is visible after reopening the app.

## Key user flows

### First archaeological dig

The user opens Home, taps **Start a dig**, selects one or more platforms, and taps **Connect Selected**. The Scan screen reports the selected sources and progress. When ready, the user taps **Continue to Discoveries** and sees ranked dormant content.

### Repurpose and review

The user taps **Repurpose Now** on a discovery. The Repurpose Review screen shows only outputs relevant to the selected platform mix. The user can tap **Review First**, approve outputs individually or with **Approve All**, then tap **Auto-Post**. Auto-Post remains unavailable until all outputs are approved in review mode.

### Persistence and autonomous follow-up

After Auto-Post, the app writes the workflow to local persistent storage and opens Results. Results show platform-specific metrics, an autonomous follow-up recommendation, and a continuity checkpoint. When the user returns to Home, the app restores a “Mind memory restored” state without requiring a new prompt.

### Recovery and empty states

If no platforms are selected, Scan displays an explanatory empty state and routes the user back to Connect Sources. If memory is malformed or unavailable, the app safely clears the invalid record and continues with a fresh state. Every action has visible feedback.

## Color choices

| Token | Color | Usage |
| --- | --- | --- |
| Background | `#100B24` | Deep indigo app background and full-bleed surfaces. |
| Surface | `#1C1438` | Elevated cards, sheets, and grouped content. |
| Surface raised | `#261B4B` | Discovery cards and interactive panels. |
| Foreground | `#F8F4FF` | Primary text and high-contrast labels. |
| Muted | `#AAA0C7` | Secondary text, metadata, and supporting explanations. |
| Gold primary | `#F4C95D` | Primary actions, Evergreen Scores, active states, and success moments. |
| Gold soft | `#FFE8A3` | Highlighted text and subtle glow treatments. |
| Border | `#3B2C62` | Card boundaries and dividers. |
| Success | `#63D79A` | Active Mind states and completed approvals. |
| Warning | `#F0A45D` | Scan or incomplete review notices. |

## iOS interaction principles

Primary actions use a minimum 44-point hit target, visible pressed feedback, and light haptics. Cards use short opacity feedback rather than heavy animation. The bottom tab bar contains Home and Discoveries, while deeper workflow screens use stack navigation and a clear back affordance. All important actions remain reachable with one hand and are labeled for VoiceOver.
