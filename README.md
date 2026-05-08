# HA Insights Card

Lovelace card for the [HA Insights](https://github.com/botts7/ha-insights) integration. Renders detected insights with **Apply / Snooze / Dismiss** actions, live-updates via the integration's WebSocket subscribe stream.

## Status

**v0.1.0** — first release.

What works in v0.1:

- List rendering of active insights (auto-filters dismissed / applied / currently-snoozed via the integration's default `list` filter)
- Per-row actions: **Apply** (write the automation), **Snooze 7d**, **Dismiss**
- Optimistic local removal + green confirmation toast on every action
- Live updates via `home_insights/subscribe` — insights from other clients (or background scans) appear immediately
- Handshake banner shows integration version + protocol number; degrades gracefully on protocol skew

Deferred to v0.2 alongside the integration's LLM gateway:

- Trust badges (🟢 LOCAL / 🟡 CLOUD / 🔴 CLOUD-real-names)
- "What gets sent?" modal
- Detail modal with payload preview + Explain button

## Install

1. **HACS → Frontend → ⋮ → Custom repositories**
2. Add `https://github.com/botts7/ha-insights-card` as type **Lovelace**
3. Click **Install**
4. Hard-refresh your browser (Ctrl+Shift+R)
5. Add the card to any dashboard:
   ```yaml
   type: custom:ha-insights-card
   ```

## Configuration

```yaml
type: custom:ha-insights-card
title: "HA Insights"        # optional, default "HA Insights"
min_confidence: 0.5         # optional, hide insights below this threshold (0..1)
max_rows: 8                 # optional, cap rendered rows
```

## Privacy

The card depends entirely on the integration's privacy model. It never makes outbound calls of its own — all insight data flows through HA's authenticated WebSocket and stays inside your network. See the [integration's privacy docs](https://github.com/botts7/ha-insights/blob/main/docs/privacy.md).

## Compatibility

- Requires the [HA Insights integration](https://github.com/botts7/ha-insights) v0.1+ installed and configured
- HA 2025.4+
- Modern browsers (last two versions of Chrome / Firefox / Safari)

## License

MIT — see [`LICENSE`](LICENSE).
