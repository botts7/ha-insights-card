# HA Insights — Lovelace Card

The companion Lovelace card for the [`ha-insights`](https://github.com/botts7/ha-insights) integration.

Renders insights with the full Apply / Refine / Explain / Hypothesize / Test / Undo surface. Drops into any Lovelace dashboard, plus auto-registers a sidebar panel.

## What it does

- **Insight rows** with confidence, age, area, conflict badges, and the proposed automation YAML
- **Apply / Undo** with drift detection — manual edits aren't silently overwritten
- **✨ Multi-turn Refine** — iterate with the LLM via `conversation_id` thread. "Refine again (turn N)" + Reset conversation buttons
- **💬 Explain** — natural-language rationale
- **🔍 Hypothesize** — plausible-cause suggestions for ANOMALY insights
- **💰 Pre-flight cost dialog** — confirms before expensive cloud calls cross your threshold
- **🔥 Test actions** — fire the action block live for real
- **🛡️ "What gets sent?"** — exact-payload redaction preview
- **Inline payload editor** — tweak the YAML before Apply
- **Bulk Apply** — apply all visible insights at once
- **Persistent panel filters** — by status, kind, detector, area
- **Sort + group** — confidence, age, detector, area

## Card config

```yaml
type: custom:ha-insights-card
include_dismissed: false
include_applied: false
sort_by: confidence  # or age, detector, area
group_by: detector    # or area, none
compact: false
search: ""
tts_target_entity_id: media_player.kitchen   # optional
tts_engine_entity_id: tts.google_translate_en  # optional
```

## Requires

`ha-insights` integration installed via HACS or manually under `custom_components/ha_insights/`.

## Documentation

See the integration's [README](https://github.com/botts7/ha-insights/blob/main/README.md) and [docs](https://github.com/botts7/ha-insights/tree/main/docs).
