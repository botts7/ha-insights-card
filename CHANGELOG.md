# Changelog

## [1.8.0] — 2026-05-17

### Added — 👆 touch-test for passive sensors (Phase B)

The killer feature of v1.10 Find-My-Device. Passive sensors (temp,
humidity, illuminance, CO₂, sound, moisture) can't self-announce
like lights / speakers — so the user **physically perturbs** them
and HA Insights tells them which entity actually spiked.

**The elimination outcome**: when the user touches what they think
is `sensor.foo` but `sensor.bar` actually spikes, the modal
displays:

> **⚠ Mislabel detected!**
> You touched what was labelled `sensor.foo`, but `sensor.bar`
> actually spiked (z=4.2, Δ=+2.8). These two entities are
> probably mislabeled — check the device names in HA and rename
> accordingly.

Mislabeling is endemic in HA installs. This is the moment that
justifies the whole feature.

### How it works

1. **👆 button** appears next to rows where the entity's
   `device_class` is in the perturbable set (temperature / humidity
   / carbon_dioxide / illuminance / sound_pressure / moisture)
   AND identify-via-Phase-A isn't supported.
2. **Click → modal opens** with the per-device_class instruction
   ("Place a finger on the sensor for 10–15 seconds"), expected
   listening window, and candidate count ("5 temperature sensors
   will be monitored").
3. **Click Start → countdown begins.** Visible progress bar +
   "Touch the sensor now!" prompt. Server captures baseline from
   the HA Insights event buffer, then opens the listening window.
4. **Window closes → ranked result displays**:
   - **Clear match** (top z > 3, gap > 1.5): "✓ Clear match:
     sensor.kitchen_temp" with peak delta + z-score
   - **Elimination** (top_match ≠ clicked entity): the mislabel
     banner above — orange warning, full explanation
   - **Ambiguous** (multiple candidates above threshold): lists
     all spiked entities with z-scores; suggests checking the 🔗
     dedup pill in case it's a multi-function device
   - **No signal**: "❌ No clear spike detected" + retry button
     + suggestions for stronger perturbation
5. **Run again / Close** — modal stays open for retries.

### Requires

HA Insights integration **v1.10.5+**. Falls back gracefully on
older / vanilla HA: the 👆 button just doesn't appear (same
opportunistic-fetch pattern as the rest of the Find-My-Device UI).

### Closes Find-My-Device Phase B

Combined with Phase A (v1.6.0 🔆 button) and the v1.5.0 sort + v1.7.0
🔗 dedup pill, every entity in the bulk-area-assign dialog now has
exactly one path to identification:

- Identify-capable (lights, speakers, sirens, switches) → 🔆
- Perturbable passive sensor → 👆
- Already-named (Tuya/Hue/HomeKit) → no button needed
- Truly unidentifiable (PM2.5, battery, pressure) → v1.11
  statistical correlation (future)

## [1.7.0] — 2026-05-17

### Added

- **🔗 Dedup pill in bulk-area-assign rows.** Renders HA Insights
  v1.10.3+'s `same_as` data: when another HA entity looks like
  the SAME physical device (shared MAC, Bluetooth address, Zigbee
  IEEE, IP/host, identifier overlap, or matching
  manufacturer+model+via_device), a small `🔗 <other-entity>`
  pill appears next to the row.

  Common scenarios this catches:
  - Tuya plug paired via Tuya cloud AND via BLE scanner
  - Govee Cloud + Govee BLE
  - Hue Bridge + Matter bridging the same Hue light
  - Shelly Cloud + local API
  - Zigbee2MQTT + ZHA pointed at the same device (migration state)

  When you see the pill, the area you assign to THIS entity
  should probably mirror to the linked one (and vice versa) —
  they're showing different views of the same physical thing.

  Thresholded at confidence ≥ 0.7 so the pill only appears when
  the signal is strong enough to trust. Tooltip carries the
  matching signal name + confidence so power users can verify
  the integration's call.

  Visually subtle (no border accent, no fill) so it doesn't
  compete with the 🆔/❓/🏷️ name-quality badges or the 🔆
  identify button — this is a HINT, not a primary action.

### Requires

HA Insights integration **v1.10.3+**. Falls back gracefully on
older / vanilla HA: pill simply doesn't render (same opportunistic
fetch as v1.5.0's smart sort and v1.6.0's identify button).

### Closes the v1.10 Find-My-Device loop in the bulk dialog

The bulk-area-assign dialog now displays four overlapping signals
per entity:
- **Sorted** worst-name-first (v1.5.0)
- **Tier badge** explaining the name-quality call (v1.5.0)
- **🔆 Identify button** to make the device physically announce
  itself (v1.6.0)
- **🔗 Dedup pill** linking entities that are likely the same
  physical device (v1.7.0)

Together: open the dialog → BLE-MAC mystery entities at the top
with 🆔, you click 🔆 to find them, and if it's actually a
duplicate of "Tuya Kitchen Plug" the 🔗 tells you up front so
you don't assign area twice.

## [1.6.0] — 2026-05-17

### Added

- **🔆 Identify button in bulk-area-assign rows.** When an entity
  supports a built-in identify signal (lights with FLASH or any
  brightness, media players, sirens, switches), a small 🔆 button
  appears next to its name. Click → fires
  `home_insights/identify_entity` (requires HA Insights v1.10.0+)
  → the device flashes / chimes / chirps / clicks so you can find
  it physically.

  Closes the Find-My-Device phase A loop: name_quality scoring
  (v1.5.0) tells you WHICH entities you don't recognize; this
  button helps you go find them.

  Per-button state cycle:
  - 🔆 **idle** — clickable; tooltip describes the signal that
    will fire ("flash the light briefly")
  - ⏳ **pending** — request in flight; disabled to prevent
    double-firing
  - ✓ **success** — call succeeded; tooltip shows what was done
    ("Done: flash the light briefly (1 call)"); auto-clears to
    idle after 3 s so you can re-fire if you missed it
  - ✗ **failed** — server-side error; tooltip shows the message;
    auto-clears after 3 s

  Hidden entirely for entities without a supported identify
  method (passive sensors, scripts, etc.) — those are the v1.10
  Phase B perturbation target.

### Requires

HA Insights integration **v1.10.0+**. Falls back gracefully on
older / vanilla HA installs: the button just doesn't render
(same try/catch that protects v1.5.0's smart sort).

## [1.5.0] — 2026-05-17

### Added

- **Smart sorting + tier badges in bulk-area-assign dialog.** When
  HA Insights v1.10.0+ is installed, the entity tab now sorts
  worst-named entities to the top so the user attacks the
  genuinely-confusing ones (BLE MACs, hex blobs) first instead
  of staring at a flat alphabetical list.

  Each row carries a small inline icon when name_quality scoring
  ran:

  - 🆔 MAC-pattern (`ATC_a4c138`) — strongest signal that this
    entity needs identification; the name carries zero locational
    information
  - ❓ generic_domain (`light.lamp1`) — fallback object_id
    rendering; investigate
  - 🏷️ mfr_model (`Aqara WSDCGQ11LM`) — has manufacturer + model
    but doesn't tell you which physical device it is
  - ✏️ user_override — you named this one yourself; no action
    needed
  - ☁️ cloud — name imported from the integration's app (Tuya,
    Hue, HomeKit, ~25 supported); should match what you named
    it there

  Tooltip on each badge carries the actual score (0–100%) and
  the lib's reasoning so power users can verify the call.

### Graceful fallback

The dialog is designed to be portable to HA core, so the call
to `home_insights/identify_capability` is opportunistic: if the
endpoint isn't present (vanilla HA install or older HA
Insights), the catch silently drops the enrichment and the
dialog falls back to alphabetical sort with no badges. No
error toast, no broken state — the integration is enrichment,
not a hard dependency.

### Performance

Scores fetched once per dialog open for up to the first 500
unassigned entities. Capped to keep the WS round-trip snappy
on huge installs. Render re-sorts in place when the response
arrives; the user sees alphabetical for ~100ms then the
smart order.

### Requires

HA Insights integration v1.10.0+ for the smart sort to
activate.

## [1.4.0] — 2026-05-17

### Added

- **🔀 Directionality badge** for `lagged_correlation` insights.
  Renders the `_directionality` payload stamped by integration
  v1.9.1 (transfer entropy direction check). Three states with
  distinct icons + tooltips:

  - **✅ direction confirmed** — TE(X→Y) dominates with non-trivial
    flow; the suggestion is well-grounded.
  - **⚠️ direction reversed** — TE(Y→X) dominates; the proposed
    leader looks like the FOLLOWER. The integration already demotes
    these ×0.5 (usually below MIN_CONFIDENCE_TO_EMIT) but if one
    slips through the user sees the warning.
  - **🔀 no clear direction** — both directions have flow; both
    entities probably driven by a third factor (time of day, manual
    ritual, an unseen scene) rather than by each other.

  Skipped entirely when assessment didn't run (`assessed: false`)
  or both TE values are below the noise floor (uninformative —
  surfacing a badge would be misleading). Noise-floor constant
  (0.05 bits) is kept in sync with `NOISE_FLOOR_BITS` in
  `custom_components/ha_insights/lib/transfer_entropy.py`.

  Tooltip carries the actual TE values so power users can verify
  the integration's call.

  Rendered in both the row view and the detail dialog, next to
  the 🔗 coupling badge. Panel embeds the card via the
  `ha-insights-card-bundled` alias, so the panel surface
  inherits automatically — no panel changes needed.

### Notes for integration users

Requires integration **v1.9.1+** to see any badge — older
integrations don't stamp the payload key. With v1.9.1+ installed,
existing `lagged_correlation` insights show the badge on next scan
(no card cache flush needed).

## [1.3.6] — 2026-05-17

### Added

- **🔇 Per-device "Suppress device" toggle** in the insight detail
  dialog. New "Devices" section lists every device this insight
  references — each row has a toggle that adds/removes the device
  from the integration's managed-externally set.

  Once suppressed, future patterns from that device are filtered
  out of detector output entirely. Companion to the 🔗 coupling
  badge: the badge INFERS device-coupling from timing; this is
  the explicit user assertion.

  Optimistic UI: clicking the toggle flips the local state
  immediately, then calls `home_insights/set_device_managed` in
  the background. On failure, the toggle reverts.

  Section renders only when the insight carries
  `referenced_devices` (server v1.7.8+). On older servers the
  section is silently absent.

- New `ReferencedDevice` type in `types.ts` mirroring the
  server's per-insight enrichment shape.

### Pairs with

Integration v1.7.8 ships the backend (filter + WS endpoints +
OptionsFlow management screen). Without it the toggle calls
fail; with it, in-context suppression is one click.

## [1.3.4] — 2026-05-17

### Fixed

- **Side panel never showed the 🔗 coupling badge** (or any other
  v1.3.0+ card changes). Root cause: when both the HACS-installed
  `ha-insights-card.js` AND the integration-bundled `panel.js` (which
  also contains the card source via `import "./ha-insights-card"`)
  loaded, whichever ran `customElements.define("ha-insights-card", …)`
  first won. If HACS card was older than the integration's bundled
  card, the panel embedded the stale HACS-loaded class — missing the
  badge code from v1.3.0+.

  Real-install diagnostic on 2026-05-17 confirmed: card state had
  `_coupling.tier === "TIGHT"` correctly stamped, the `_renderRow`
  method WAS called, `_renderCouplingBadge` invocation WAS present in
  the bundle — but 0 `.coupling-badge` elements rendered. Stale-class
  registration was eating the new render code.

  v1.3.4 registers a separate `ha-insights-card-bundled` element name
  in the panel bundle (trivial subclass of the freshly-built
  `HaInsightsCard`). The panel embeds `<ha-insights-card-bundled>`
  instead of `<ha-insights-card>` — guaranteed to use the bundle's
  own class, regardless of what HACS has done with the dashboard
  card. The dashboard `<ha-insights-card>` element keeps working
  exactly as before.

## [1.3.3] — 2026-05-17

### Fixed

- **Panel rendering twice on first navigation** — v1.3.1's recovery
  IIFE called `tryRecover()` synchronously at module load AND started
  a polling burst immediately. On first `/ha-insights` visit, our
  force-mount ran before HA's normal panel resolver finished, so HA
  then mounted a second `ha-insights-panel` on top of ours. The
  `wrap.querySelector("ha-insights-panel")` guard caught subsequent
  attempts but not the initial race. Result: two complete panels
  stacked in the wrapper.

  v1.3.3 fixes both sides of the race:
  1. **Dedupe pass** at the start of every `tryRecover()`. If
     multiple `ha-insights-panel` children exist, all but the first
     are removed. Idempotent.
  2. **500ms first-probe delay** in the burst. HA's normal resolver
     finishes well within that window on healthy installs; we only
     force-mount after that grace period.
  3. **No more module-load `tryRecover()`** — that synchronous call
     was the worst offender. The burst-with-delay covers both the
     "navigate to /ha-insights" and "fresh page load" cases without
     racing.
  4. Logs `[ha-insights] removed N duplicate panel element(s)` when
     dedupe fires, so users on stuck-double-panel can see the fix
     working.

## [1.3.2] — 2026-05-17

### Fixed

- **Release workflow now attaches `ha-insights-panel.js` to GitHub
  releases.** Pre-v1.3.2 only `ha-insights-card.js` was uploaded,
  which meant `src/ha-insights-panel.ts` changes never reached
  users via HACS — HACS only pulls the file in `hacs.json:filename`,
  and the integration's expected `/local/community/ha-insights-card/
  ha-insights-panel.js` path was filled by whatever was last
  manually committed to `dist/`. The v1.2.26 blank-panel recovery
  fix and the v1.3.1 shadow-DOM observer fix BOTH reached users only
  via that fragile path.

  Going forward: the integration repo bundles `panel.js` as a static
  asset (v1.7.3+) and serves it from its own URL. This release
  attachment lets that bundling step pull a fresh per-release build.

## [1.3.1] — 2026-05-17

### Fixed

- **Blank panel after HACS update — root cause: MutationObserver
  scoped to wrong DOM tree.** The v1.2.26 recovery installed an
  observer on `document.body`, but `<ha-panel-custom>` (the wrapper
  HA mutates when mounting our panel) lives inside
  `<home-assistant-main>`'s shadow root. **MutationObservers do not
  cross shadow-root boundaries** — so the observer fired on
  unrelated mutations but never saw the one that mattered.

  Symptom: blank `/ha-insights` page after any HACS update; only
  Ctrl+Shift+R fixed it. User-supplied DevTools diagnostic on
  2026-05-17 captured the exact state — wrapper present and
  configured, panel class registered, but `__haInsightsPanelRecovery`
  sentinel never installed → recovery code from v1.2.26 was simply
  not in the loaded bundle, AND when it WAS loaded its observer was
  on the wrong tree.

  v1.3.1 ships a properly-scoped recovery:
  1. Observer attached to `home-assistant-main`'s shadowRoot
     directly (with a 30s poll backstop covering the brief window
     before HA mounts main).
  2. URL-change listeners (`popstate`, `hashchange`, wrapped
     `pushState` for Vaadin Router) trigger recovery on every
     navigation.
  3. 5-second polling burst after each navigation to catch the
     `AbortError: Transition was skipped` race where HA inserts
     the wrapper but its inner mount silently fails.
  4. `window.__haInsightsPanelRecovery` is now a state object
     `{installed, attempts, forcedMounts, lastAttemptAt}` instead
     of a boolean — future blank-panel reports can read counts.
  5. Logs `[ha-insights] panel mount recovered (forced-mount #N,
     attempts=M)` when recovery fires, so users can see it working.

  All idempotent, scoped to `/ha-insights*` only, zero behavior
  change when HA's mount works correctly.

## [1.3.0] — 2026-05-17

### Added

- **🔗 Coupling-strength badge.** When a cooccurrence / lagged /
  button-press insight comes from a tightly-coupled pair (sub-500ms
  median lag with ≥90% consistency), the card now renders an inline
  🔗 badge next to the title. Hover for "These entities change
  together within ~Nms (X% consistency) — looks like a device
  binding or a pre-existing automation, not a new pattern to
  automate."
- The integration also demotes such insights' confidence (×0.85) so
  they rank below uncoupled suggestions, but they still emit — the
  user gets to judge whether the coupling is "device-internal,
  ignore" or "I forgot I built that automation, dismiss it."

  Pairs with this signature are almost always one of:
  - ESPHome `on_press` / Z-Wave central scene / Zigbee binding —
    device handles the action locally, HA observes both state
    changes microseconds apart.
  - An existing HA automation already firing on the same trigger.

  Either way, surfacing them as fresh automation suggestions is
  noise. Now the badge tells the user why we're showing it muted
  rather than hiding it.

Requires integration v1.7.0+. Older integration versions don't stamp
`_coupling`; the card gracefully renders nothing (back-compat).

## [1.2.29] — 2026-05-17

### Fixed

- **Release workflow can now actually update the GitHub release.**
  `softprops/action-gh-release@v2` needs `contents: write`, but the
  workflow didn't declare it — every tag push since v0.8 has been
  failing with `Resource not accessible by integration`. Added the
  `permissions` block at the workflow level.

### Added

- **HACS validation workflow.** `validate.yml` runs `hacs/action@main`
  with `category: plugin` on every push and PR plus the standard
  Monday-04:00 cron. The HACS catalog PR template requires a link
  to a successful HACS action run; until v1.2.29 the card had no
  such workflow.

This release exists purely to unblock the HACS catalog submission
([hacs/default](https://github.com/hacs/default) PR for botts7/ha-insights-card).

## [1.2.28] — 2026-05-17

### Added

- **Retire button** on the row dialog, alongside Dismiss and Snooze.
  Third lifecycle option: *"I've consciously decided NOT to automate
  this pattern, even though the detector keeps seeing it."* Survives
  re-detections of the same fingerprint until explicitly un-retired.
  Calls the v1.5.46 `home_insights/retire` WS endpoint. Visually
  distinct (dashed border) so it reads as the "permanent" option
  relative to the temporary Snooze. Confirmation copy via toast,
  not a dialog, to keep the flow snappy.
- **History view toggle** in the header — toggling on swaps the chip
  to amber and re-fetches the list with `include_retired`,
  `include_dismissed`, and `include_snoozed` all `true`. The
  user can browse their prior lifecycle decisions, un-retire the
  ones that should re-enter the active queue (new `↺ Un-retire`
  button on retired rows), and toggle back to the default view
  when done. Day-to-day list stays clean by default.
- `Insight.retired_at` / `Insight.dismissed_at` TS types — surfaced
  by the integration when the corresponding `include_*` flag is set
  on the list call. Used by the row chrome to decide whether to
  show Retire vs ↺ Un-retire.

Requires integration **v1.5.46** for the new WS endpoints.

## [1.2.27] — 2026-05-16

### Added

- **💡 Add — Suggested Additions modal.** New pill on automation-payload
  insight rows ("💡 Add", next to the existing audit "Preview" pill) opens
  a modal that surfaces deterministic candidate entities — coactivators,
  device-mates, area-mates, and domain-siblings — that the user may want
  to fold into the automation's action block.

  Local-first, no LLM tokens spent. Candidates come back tier-graded
  (HIGH / MEDIUM / LOW) with a green / amber / grey chip matching the
  card's existing confidence-colour convention, plus a one-line reasons
  string per row ("same area as light.kitchen · cross-domain", etc.).
  HIGH-tier rows are pre-selected by default; user freely toggles.

  Apply calls `home_insights/apply` with `additional_entity_ids: […]`.
  The integration deterministically grafts same-domain entities into the
  existing action's `target.entity_id` / `data.entity_id` field (any of
  the three legacy shapes), and creates new `<domain>.turn_on` actions
  for the 21 known turn_on/off-compatible cross-domain candidates.
  Anything that needs a different service call (e.g. `climate.set_temperature`)
  comes back as `unhandled_entity_ids` and the toast prompts the user
  to open **Refine** to escalate to LLM.

  Pairs with integration **v1.5.44** (which ships the
  `home_insights/suggest_additions` WS endpoint, the candidate-builder
  with action-target filtering, the deterministic YAML appender, and
  the L1/L2 validation pipeline extensions).

## [1.2.26] — 2026-05-16

### Fixed

- **Blank panel after navigation — TRUE root cause + permanent fix.**
  Verified via user-supplied DevTools introspection that HA's
  `<ha-panel-custom>` wrapper element loses its `panel.config` under
  certain navigation cycles + browser pairings, while still being
  rendered on the route. Without `config.component_name`, HA's
  panel-resolver doesn't know which custom element to instantiate
  inside the wrapper, so it stays empty. The resolver also doesn't
  retry. Result: user sees a blank `/ha-insights` page despite our
  panel class being correctly registered, our JS bundle being loaded,
  and `customElements.get('ha-insights-panel')` returning `true`.
  This is upstream HA frontend behavior, not a bug in our integration.

  v1.2.24 (customElements double-register) and v1.2.25 (chrome polish)
  were both correct fixes for OTHER classes of bug, but did not address
  this one because the precondition checks they hardened were all green
  in the broken state.

  **Fix**: a small panel-mount-recovery sentinel installed once on
  module load. A scoped `MutationObserver` watches for `<ha-panel-custom>`
  elements that end up empty on the `/ha-insights*` route and force-
  mounts `<ha-insights-panel>` inside them with `hass` / `narrow` / `panel`
  props copied from the wrapper. Idempotent (skips already-mounted
  wrappers), scoped to our route only, no behavior change when HA is
  healthy. ~30 lines.

  Verified with the same DevTools diagnostic that surfaced the bug:
  `wrap.appendChild(document.createElement('ha-insights-panel'))`
  resurrects the panel — our element renders correctly from `hass`
  alone, doesn't depend on the missing `panel.config`.

## [1.2.25] — 2026-05-16

### Changed

- **Chrome emoji icons replaced with `<ha-icon>` / MDI.** Panel action
  strip (`Backfill`, `Run audit rollup`, `Stop rollup`, `Scan now`,
  `Stop`, `Reload UI`, `Purge all`, `Apply all visible`) and the card
  header's "View all" link now render via `mdi:database-refresh /
  calendar-clock / stop / magnify-scan / refresh / delete-sweep-outline
  / check-all / arrow-right`. Emojis in *content* (insight titles,
  audit findings, the `🤖 device-managed` differentiator pill,
  `🛡️ What gets sent?` privacy shield, `🔁 already automated` pill,
  `✨ Refine` button) are preserved — those are part of the visual
  identity. Cross-platform emoji rendering inconsistency (Windows
  Segoe vs Apple Color Emoji vs Noto) is no longer in the chrome.
- **Card header upgraded.** Title bumped from `1.1em / weight 500` to
  `1.2em / weight 600`. The `vX · protocol N` subtitle is replaced by
  a live state line — `${count} insights` when connected, `Connecting…`
  during the handshake. The version/protocol info moves to the title's
  `title=` tooltip so it stays discoverable for debugging. "View all"
  is now a proper pill-style outlined button with a 24×24 minimum
  touch target (WCAG 2.2 AA) and a `mdi:arrow-right` icon.
- **`Scan now` promoted to primary action** in the panel header (filled
  primary color). The other 7 buttons keep their outlined treatment
  but no longer compete for attention.
- **Row meta tiered into two lines.** Primary line keeps action-relevant
  pills (`confidence`, maturity, `✓ applied`, `🔁 already automated`,
  `🤖 in N automations`, `🤖 device-managed`, `💬 explained`, audit
  `🤖 Suggest` and `📋 Preview` buttons). Secondary line carries
  identity context (`detector · area · integration · age · managed by
  vendor`) as plain `·`-separated text in a slightly smaller, dimmer
  treatment. Drops the per-row trust pill — the card header already
  shows the privacy mode, so the per-row repetition was redundant.
  Result: 7-8 pills per row become 3-4, room titles read first.
- **Row hover affordance strengthened.** Background opacity bumped from
  3% → 5% and a 2px primary-color inset accent bar appears on the
  left edge when hovering, matching the Brookesia row-hover language.

### Notes

This is the v1.2.25 "launch polish batch 1" release — surgical visual-
consistency changes recommended in `.dev/design-review-2026-05-16.md`.
Items deferred to v1.2.26: filter-bar chip-picker conversion, modal-kit
consolidation, payload YAML rendering with collapse, compact-tile
confidence histogram, empty-state sample-row preview.

## [1.2.24] — 2026-05-16

### Fixed

- **Blank panel on tab-return / re-mount.** `<bulk-area-assign-dialog>`
  used the `@customElement` decorator without a guard. When HA
  re-mounted the panel after the tab was backgrounded, the bundle
  module re-evaluated and the decorator called `customElements.define`
  a second time — the scoped-custom-element-registry polyfill threw
  `DOMException: ... has already been used with this registry`, which
  killed every subsequent expression in the module. The panel went
  blank until a hard refresh. Switched to the guarded `if
  (!customElements.get(...)) customElements.define(...)` pattern that
  the three other top-level elements (`ha-insights-card`,
  `ha-insights-panel`, `ha-insights-card-editor`) already use. Second
  module-eval is now a clean no-op.

## [1.2.6] — 2026-05-14

### Added

- **`<bulk-area-assign-dialog>`** — self-contained dialog for bulk-
  assigning entities and devices to areas, opened from the
  setup_quality "Room presence inference" insight. Two tabs: Devices
  (default — area on a device cascades to every entity it owns) and
  Entities (per-entity override for floating entities or to break the
  cascade). Per-row area picker, filter, "show all" toggle.

  Designed for **HA core adoption**: uses only HA's standard config-
  registry WebSocket APIs (`config/area_registry/list`,
  `config/device_registry/list`, `config/entity_registry/list`,
  `config/device_registry/update`, `config/entity_registry/update_entity`)
  with no dependency on the HA Insights backend. Lives in
  `src/dialogs/bulk-area-assign-dialog.ts` as a separate component
  that could be lifted straight into HA core's `frontend/src/dialogs/`
  by swapping the minimal `HassLite` import for the real
  `HomeAssistant` type. Theming is HA CSS variables only.

## [1.2.5] — 2026-05-14

### Fixed

- **Per-member badges in cohort dropdown.** When a streak/long_tail/
  orphan cohort mixed entities from multiple integrations, the
  row-level `🏷️ managed externally` badge was suppressed by the
  cohort-safety rule (don't falsely tag a non-Tuya entity as
  Tuya-managed). UX cost: the user saw the *same entity_id* in two
  different rows with different badges and it looked broken.
  Expanded cohort dropdown now shows the `🔌 integration` +
  `🏷️ external-app` badge next to each entity individually, so the
  Tuya-managed lights get tagged correctly even when their cohort
  includes a Hue/MQTT entity. Requires ha_insights ≥ 1.5.13 for the
  enriched payload; falls back to plain entity-id chips when the
  WS payload lacks `cohort_member_info` (older insights).

## [1.2.4] — 2026-05-14

### Fixed

- **Graceful degrade when a setup_quality insight predates v1.5.11.**
  Insights stored before the v1.5.11 detector update don't carry the
  `setup_steps` array, so the new dialog body had nothing to render
  in the feature-cards section — users saw the stale "Tap each to
  learn more" copy from the old payload's explanation with no
  visible tap target. Dialog now detects the missing `setup_steps`
  and shows an inline "🔍 Run scan now" button instead of dead text,
  with copy explaining that the actions live in the explanation
  above until a re-scan refreshes the card.

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
