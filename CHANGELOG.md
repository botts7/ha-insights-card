# Changelog

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
