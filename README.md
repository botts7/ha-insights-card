# HA Insights Card

Lovelace card and sidebar panel for the [HA Insights](https://github.com/botts7/ha-insights) integration. Surfaces detected insights with rich actions: **Apply / Refine / Explain / Test / Snooze / Dismiss**, live-updates via the integration's WebSocket subscribe stream.

## Status

**v1.2.23** — full UX surface for the integration's v1.5 detector + signal-grader library, audit, and refine pipelines.

### Card features
- **Adaptive row count** — card auto-fits its row count to the available height (each ~72px). Set `max_rows` to disable, or `compact: true` for a single-line tile that deep-links to the panel.
- **Visual editor** — native `<ha-form>` schema-driven config: title, min_confidence slider, max_rows, compact toggle, TTS target / engine entity pickers, search, sort, group.
- **Per-row trust pill** — 🟢 local or 🟡 cloud at-a-glance reminder of where any LLM action would go.
- **Confidence color pills** — green ≥0.8, amber ≥0.5, red below.
- **🤖 device-managed pill** — surfaced when one or more of the four signal-grader libs (timing / co-occurrence / persistence / transition-entropy) classifies a pattern as device-driven rather than human routine. Tooltip explains which signal demoted the row (e.g. *"every previous-state duration lasts ~120 s with CV 0.0 % across 18 events — robotic precision"*). See the [integration's device-vs-human classification](https://github.com/botts7/ha-insights#device-vs-human-classification-v1535) for the maths.
- **Filter chips** — Detector, Area, Floor, Integration, Label (HA 2024.4+), maturity tier, and a "Hide already-automated" toggle.
- **Insight age** — "12m ago" / "yesterday" / "1w ago" in the row meta strip.
- **Click-to-detail modal** — wide (900px max) with full automation YAML preview, scrollable.

### Modal actions
- **✨ Refine with LLM** — side-by-side original-vs-refined view, rationale, color-coded diff, follow-up feedback textarea (pre + post refine), apply-refined / refine-again / keep-original.
- **💬 Explain with LLM** — natural-language rationale; scoped errors stay in the modal.
- **🛡️ What gets sent?** — exact redacted payload preview before any LLM call.
- **🔥 Test actions** — fires the action block for real with per-action results panel.
- **🔊 Read aloud** — TTS the explanation through a configurable media_player.
- **Customize** — inline alias / description rename before Apply.
- **📋 Preview deterministic fix** — for audit findings with an algorithmic fix (redundant_target, long_on_duration, trigger_time_drift), opens an IDE-style LCS-aligned side-by-side diff with zero LLM tokens. Apply commits via the existing validator + writer.

### Sidebar panel (`/ha-insights`)
- **Search** — substring filter on insight title (case-insensitive).
- **Min-confidence slider**.
- **Sort by** — Confidence (default) / Newest / Detector.
- **Group by** — None / Detector / Area.
- **Action buttons** — 🔄 Backfill, 🔍 Scan now.
- **🛡️ LLM activity** — collapsible audit log of recent outbound calls.

## Install

1. **HACS → Frontend → ⋮ → Custom repositories**
2. Add `https://github.com/botts7/ha-insights-card` as type **Lovelace**
3. Click **Install**
4. Hard-refresh your browser (`Ctrl+Shift+R`)
5. Add the dashboard card:
   ```yaml
   type: custom:ha-insights-card
   ```
6. Click the **Insights** entry in HA's left sidebar for the full-page panel (registered automatically by the integration).

## Configuration

| Field | Type | Default | Notes |
|---|---|---|---|
| `title` | string | `"HA Insights"` | Card header |
| `min_confidence` | number 0-1 | `0` | Hide insights below this confidence |
| `max_rows` | number | adaptive | Cap rendered rows; blank = auto-fit to card height |
| `compact` | bool | `false` | Single-line tile mode that deep-links to the panel |
| `tts_target_entity_id` | entity | — | media_player to speak the LLM explanation through |
| `tts_engine_entity_id` | entity | first `tts.*` | Override which TTS engine to use |
| `search` | string | — | Default substring filter on insight title |
| `sort_by` | enum | `"confidence"` | `confidence` / `age` / `detector` |
| `group_by` | enum | `"none"` | `none` / `detector` / `area` |

All fields are also editable via HA's visual card editor.

### Compact tile

```yaml
type: custom:ha-insights-card
compact: true
```

Renders as `3 insights ready to review →` linking to the panel — perfect for a dashboard summary slot.

### Filtered list

```yaml
type: custom:ha-insights-card
title: High-confidence routines
min_confidence: 0.8
sort_by: age
group_by: area
```

## Privacy

The card depends entirely on the integration's privacy model. It never makes outbound calls of its own — all insight data flows through HA's authenticated WebSocket and stays inside your network. The 🛡️ "What gets sent?" button shows the exact redacted payload before any LLM call. See the [integration's privacy docs](https://github.com/botts7/ha-insights/blob/main/docs/privacy.md).

## Compatibility

- Requires the [HA Insights integration](https://github.com/botts7/ha-insights) v1.5+ installed and configured. (Older v0.7–v1.4 integration installs work but won't surface audit findings, the device-managed pill, or filter chips for Floor / Integration / Label.)
- HA 2025.6+ (label chips need HA 2024.4+ on the integration side).
- Modern browsers (last two versions of Chrome / Firefox / Safari).

## License

MIT — see [`LICENSE`](LICENSE).
