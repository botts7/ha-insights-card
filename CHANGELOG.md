# Changelog

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
