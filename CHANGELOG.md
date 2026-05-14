# Changelog

## [1.2.3] — 2026-05-14

### Added

- **"Showing N of M — +X more →" footer** on the card when the
  rendered row count is less than the full filtered count. Without
  this, a dashboard tile sized to fit one insight just shows that
  one with a "View all →" link in the header, and the user has no
  way to know 25 more are queued behind it. The footer is itself a
  clickable link to `/ha-insights`. Renders only when truncation is
  actually happening (no footer when all rows fit).

## [1.2.2] — 2026-05-14

### Fixed

- **Panel no longer goes blank after backgrounding the browser tab.**
  When the tab is hidden long enough for HA's frontend to drop its
  WebSocket connection, `home-assistant-js-websocket` auto-reconnects
  AND auto-resubscribes our `home_insights/subscribe` handle — so the
  live event stream stays intact. But any events fired *while paused*
  go to a stale local list cache. Card now listens for
  `document.visibilitychange` and on becoming-visible re-runs the
  same `home_insights/list` refresh path the panel uses after a
  Scan/Purge/Backfill. Single re-fetch on resume; no subscription
  churn or workaround for built-in HA reconnect machinery.

## [1.2.1] — 2026-05-14

### Fixed

- **setup_quality dialog now shows a setup guide, not a YAML refine UI.**
  The generic insight dialog (with JSON payload editor, "Customize" rename
  form, "Notes for the LLM (used by Refine)" textarea, Refine / Test
  actions / Apply buttons) is meaningless for `setup_quality` insights —
  they're observational and the actionable response is "open HA settings
  and wire X", not "tweak some YAML". The dialog now branches on
  `insight.detector === "setup_quality"` and renders a per-feature
  checklist with tier badge (✅ Working great / 🟢 Working / 🟠 Partial /
  🔴 Not configured), an expandable "What this unlocks" list of concrete
  scenarios, and a deep-link button to the relevant HA settings page
  (`/config/areas/dashboard`, `/config/integrations/integration/ha_insights`,
  Companion App docs, etc.). Footer keeps Dismiss + Snooze 7d; hides the
  apply/refine surface that doesn't apply.

## [0.8.2] — 2026-05-10

UX polish + recovery flows for the apply pipeline.

### Added

- **Edit refined before Apply** — `_renderPayloadView` now accepts an optional `basePayload`, and `_togglePayloadEdit` seeds the textarea from whichever payload the user is currently looking at. The refined-preview view gains an "Edit refined before Apply" section so users can tweak the LLM's output before applying. Apply already prefers `editedPayload` over `refinedPayload` when both are present, so no changes were needed in the apply path.
- **Constraint-hint auto-fill** — when refine fails with a "references entities not in the original" validation error, the card mirrors the server's `_collect_entity_ids` walk on the original payload (entity_id / entity_ids fields only), auto-populates the feedback textarea with `"Use ONLY these entity_ids: [list]. Do not introduce any new entities. Adding new services on the existing entities is fine."`, and points the user there via the modal error message. Click ✨ Refine again to retry with the constraint applied.
- **Empty state CTA** — when the card has no insights to show, the empty body now exposes a `🔍 Run scan now` button (calls `ha_insights.scan_now` + refreshes the list) and a `How it works ↗` link to the project README.
- **Persistent panel filters** — the panel's search, min-confidence, sort-by, group-by, and audit-open state save to `localStorage` (versioned key `ha-insights-panel-filters-v1`) and restore on connect, so re-opening the panel preserves the user's triage view.

### Changed

- `card_version` handshake bumped to `0.8.2`.

## [0.8.1] — 2026-05-10

Three apply-flow polish items.

### Added

- **Inline payload editor** — new `✎ Edit` button in the modal swaps the read-only `<pre>` for a `<textarea>` of the JSON payload. User can rewrite the whole automation pre-Apply (not just alias/description). Apply parses the textarea, sends parsed dict via the existing `payload_override`. Parse errors surface inline; modal stays open for the fix. New apply-toast label `Applied (edited)` so the user knows what shipped.
- **Bulk apply in panel** — new `✓ Apply all visible` header button iterates the currently-filtered list and applies each insight as a real HA automation. Confirms first; toast summarizes successes vs errors with first error message.
- **LLM-busy pulse animation** — Refine + Explain buttons pulse (1.4s ease-in-out opacity) while the WS round-trip is in flight, with `💭 thinking…` / `💭 refining…` copy. Replaces the static "asking LLM…" text.

### Changed

- `card_version` handshake bumped to `0.8.1`.
- Edit precedence in `_apply`: edited > refined > original; rename block layers on top of whichever base is active.
- Apply now cleans up payload-edit state on success (matching the existing rename / refined cleanup).

## [0.8.0] — 2026-05-10

Card UX for v0.8.0's undo flow.

### Added

- **Insight type** gains `applied_at`, `applied_artifact_id`, `undo_window_expires_at` (mirrors integration v0.8 schema).
- **`include_applied` card config** (default `false`) — when true, the card lists already-applied insights so the Undo button is reachable from the dashboard. Wired through to `home_insights/list`.
- **✓ applied row pill** — green pill with `Applied at <timestamp>` tooltip on rows where `applied_at` is set.
- **↶ Undo apply button** — replaces the Apply button in the modal footer when an insight is already applied. Calls `home_insights/undo`. On `code: "drift"` error, shows a `window.confirm` with the server's message; on user confirmation, retries with `force=true` (and the toast warns that manual edits were lost).

### Changed

- Subscribe handler distinguishes `applied` (drop or update by `include_applied`) and the new `undone` event (always re-add or update so the row reappears in the active list).
- `card_version` handshake bumped to `0.8.0`.

## [0.7.0] — 2026-05-09

UX polish to scale with the new detector library — color coding, age, sort, group.

### Added

- **Confidence color coding** on the row pill: green ≥0.8, amber ≥0.5, red below. Quick triage at a glance.
- **Insight age display** — new pill shows relative time since the insight was created: `12m ago`, `3h ago`, `yesterday`, `2d ago`, `1w ago`. Hidden for very fresh insights (<5min) to avoid clutter on brand-new rows. Hover shows the absolute ISO timestamp.
- **Sort by** dropdown in the panel filter row: **Confidence** (default), **Newest**, **Detector** name.
- **Group by** dropdown: **None** (default), **Detector**, **Area**. Section headers render above each bucket with the group key + count.
- New `CardConfig.sort_by` and `CardConfig.group_by` fields so the dashboard card can also be configured with fixed sort/group via YAML or the visual editor.

### Changed

- `card_version` handshake bumped to `0.7.0`.

## [0.6.0] — 2026-05-09

Card UX for v0.6.0's trust & visibility work.

### Added

- **Per-row trust pill** — small 🟢 local or 🟡 cloud pill in each insight's meta strip mirroring the integration's privacy mode. Suppressed in OFF mode. Constant reminder of where any LLM action on this row would go.
- **🛡️ "What gets sent?" button** — appears next to Explain/Refine when LLM is enabled. Calls `home_insights/redaction_preview` and shows an inline panel with: stats (N pseudonymized, K stripped, M blocked), the actual redacted JSON, and the local pseudonym map (real → pseudo). Toggle: click again to hide. Available in both standard and refined-preview views.
- **Panel "🛡️ LLM activity" section** — collapsible audit log at the bottom of the /ha-insights panel. Lazy-loads last 25 outbound LLM calls on first open: ✓/✗ icon, insight title, timestamp, agent, redaction mode, bytes sent/received. Deleted insights show as `[deleted <id>]`.

### Changed

- `card_version` handshake bumped to `0.6.0`.

## [0.5.1] — 2026-05-09

Card UX polish for the v0.5.1 refine work plus a critical panel state-loss fix.

### Added

- **Side-by-side original-vs-refined view** in the refined-preview dialog — two YAML columns with independent scroll, each capped at 300px tall, refined column has a green left border. Stacks to a single column under 720px wide.
- **Follow-up feedback textarea** — visible in BOTH the standard insight view (label: "Notes for the LLM (optional, used by Refine)") and the refined-preview view (label: "Ask the LLM for further changes"). Sends the typed text as `feedback` to `home_insights/refine`. Pre-refine notes carry into the first refine call; post-refine notes drive iteration. Auto-clears once the LLM consumes them on a successful refine.
- **Modal-scoped errors** — actions originating inside the dialog (Apply / Refine / Explain / Test / TTS / Dismiss / Snooze) now surface their errors in a banner at the top of the modal body, not on the main card. Dashboard rows stay visible while the user retries inside the dialog.
- **Declarative `config` setter on `<ha-insights-card>`** — supports `<ha-insights-card .config=${cfg}>` template binding so parent components (the panel) preserve the card element across re-renders.

### Fixed

- **Panel was destroying card state mid-refine.** The panel's embedded `<ha-insights-card>` was being torn down and re-mounted on every panel re-render (toast tick, hass tick, slider drag) because of imperative `document.createElement` rendering. The fresh card had no `_dialogId`, so the user's open modal vanished mid-Refine, and the in-flight server response landed on a detached element. Switched to declarative Lit template binding via the new `config` setter. Refine, Apply, Test, etc. now survive any panel state change.

### Changed

- `card_version` handshake bumped to `0.5.1`.

## [0.5.0] — 2026-05-09

Major UX expansion: dedicated panel, visual editor, adaptive sizing, compact tile mode, wider modal, and live search.

### Added

- **`<ha-insights-panel>` sidebar component** (new `dist/ha-insights-panel.js` bundle) — full-page insights view registered by the integration at `/ha-insights`. Sticky header with action buttons (🔄 Backfill, 🔍 Scan now), filter row (search input + min-confidence slider), embedded card body with no row cap. Top-right toast for backfill/scan results.
- **Visual editor** (`<ha-insights-card-editor>`) — replaces the "Visual editor not supported" fallback. Native `<ha-form>` schema-driven UI: title text, confidence slider, max-rows number, compact toggle, media_player + tts entity pickers, default-search text. `getConfigElement()` + `getStubConfig()` Lovelace hooks wired.
- **Adaptive row count** — `ResizeObserver` measures the card's height and auto-computes how many rows fit (~72px per row + 60px header). User-set `max_rows` still takes precedence; min 1 row so a tiny slot never goes empty.
- **Compact tile mode** — new `CardConfig.compact: true` collapses the card to a full-width clickable tile (`"3 insights ready to review →"`) that deep-links to `/ha-insights`. Useful as a dashboard summary.
- **"View all →" header link** — always-on link in the card header pointing at `/ha-insights`.
- **Live search filter** — `CardConfig.search` substring filter on insight title (case-insensitive). Panel's search input writes through to this; manual config also works.
- **Wider modal** — `max-width: 900px` (was 600), `92vw` cap on small screens. YAML payload `<pre>` gets a 360px scroll cap so very long automations stay readable without growing the modal off-screen.

### Changed

- `card_version` handshake bumped to `0.5.0`.
- Card header is now a flex layout with title + subtitle on the left and the "View all →" link on the right.

## [0.4.0] — 2026-05-09

Companion release for HA Insights v0.4.0 (recorder backfill).

### Added

- **Backfill toast** — on first connect after install, the card calls `home_insights/backfill_status` and surfaces a green toast (`"Backfilled N events from K entities (Dd)"`) when the integration's auto-on-setup backfill ingested real data. Silent on 0-event runs (clean installs without recorder history) and on stale runs (>5min ago) so reloads don't replay old toasts.
- **Backfill-running indicator** — `"Backfilling history…"` toast if a backfill is in progress when the card connects.

### Changed

- `card_version` handshake bumped to `0.4.0` so the integration can identify the card's protocol-feature surface.

## [0.3.0] — 2026-05-09

Modal-based detail UI, TTS read-back, Refine-with-LLM, Test actions with per-action results panel.

### Added

- **Modal-based detail dialog** — clicking a row launches an HA-style overlay (centered, ESC + click-out to close, body-scroll-lock). Card stays compact one-row-per-insight regardless of how many insights are open, so dashboard layout no longer shifts when users open or close detail.
- **🔊 Read aloud (TTS)** — new card option `tts_target_entity_id` (media_player). When set + an explanation is present, modal exposes a TTS button that calls `tts.speak`. Card auto-picks the first `tts.*` engine; override with `tts_engine_entity_id`.
- **✨ Refine with LLM** — new button next to Explain. Calls `home_insights/refine`; on success the dialog body switches to a green refined-preview banner with rationale, color-coded diff list (`+`, `-`, `~`), the full refined YAML, and per-action buttons: **Apply refined** / **Refine again** / **🔥 Test refined** / **Keep original** / **Dismiss**. Refined preview held in card state per-insight (Map<insightId, RefinedState>) — local only, never persisted.
- **🔥 Test actions** — fires the action block via `home_insights/test_actions`. Inline results panel inside the dialog: per-action breakdown with ✓/✗/— icons, service name, and error message. Color-coded border (green/red/neutral). Replaces the prior toast-only feedback.
- **Customize alias / description before Apply** — inline rename inputs in the dialog body. Pre-filled from the active payload (original or refined); changes are merged into the override and sent via the existing `payload_override` plumbing. Discarded if the modal is closed without applying. Works identically for refined automations.
- **Privacy mode badge** in card header (🚫 Off / 🟢 Local / 🟡 Cloud) sourced from `home_insights/hello`.
- **Dismissible error banner** at the top of the card — rows stay visible so the user can fix the underlying issue and retry without losing state.

### Changed

- Subscribe-event handler removes rows on `applied` / `snoozed` / `dismissed` (was only `dismissed` in v0.1).
- Optimistic local removal + green confirmation toast on Apply / Snooze / Dismiss.
- Test actions fires immediately (no browser confirm dialog) — matches HA's native "Run Actions" UX. The button label + emoji + inline results panel are the warning.

## [0.2.0] — 2026-05-09

Card UX for v0.2's LLM Explain feature.

### Added

- **Privacy mode badge** in the header (🚫 Off / 🟢 Local / 🟡 Cloud) sourced from the integration's `home_insights/hello` response.
- **Click-to-expand row detail** showing the full automation YAML + an **Explain with LLM** button (gated by mode != Off).
- **LLM explanation rendering** as a styled blockquote below the YAML preview after a successful Explain call.
- **Dismissible error banner** at the top of the card — rows stay visible so the user can fix the underlying issue and retry without losing state.
- **Optimistic local removal** + green confirmation toast on Apply / Snooze / Dismiss; row vanishes immediately rather than waiting for the subscribe round-trip.

### Changed

- Subscribe-event handler removes rows on `applied` / `snoozed` / `dismissed` (was only `dismissed` in v0.1).

## [0.1.0] — 2026-05-08

First release alongside the [HA Insights integration](https://github.com/botts7/ha-insights) v0.1.0.

### Added

- Lit-based custom element `<ha-insights-card>`
- WebSocket subscription to the integration's stable `home_insights/*` API
- Insight rows with title, confidence pill, area chip, conflict warning
- Per-row actions: Apply, Snooze 7d, Dismiss
- Optimistic local removal on action + green confirmation toast
- Live updates via `home_insights/subscribe` (insights from other clients/scans appear immediately)
- Handshake banner with integration version + protocol number
- Graceful protocol-skew degradation with prompt to update either side
- Card configuration: `title`, `min_confidence`, `max_rows`

### Deferred to v0.2

- Trust badges (🟢 LOCAL / 🟡 CLOUD / 🔴 CLOUD-real-names)
- "What gets sent?" modal
- Detail modal with payload preview + Explain button
- Card editor (HA's default YAML editor works in v0.1)

[0.1.0]: https://github.com/botts7/ha-insights-card/releases/tag/v0.1.0
