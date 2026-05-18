/**
 * HA Insights sidebar panel.
 *
 * Full-page experience: search + detector filter chips + the
 * existing ha-insights-card embedded with no row cap, so the user can
 * triage / apply / refine insights without the dashboard layout
 * pushing other cards around.
 *
 * Loaded via the integration's panel registration:
 *   frontend.async_register_built_in_panel(
 *     hass, component_name="custom", sidebar_title="Insights",
 *     sidebar_icon="mdi:chart-arc", frontend_url_path="ha-insights",
 *     config={"_panel_custom": {"name": "ha-insights-panel", ...}},
 *   )
 */
import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { HaInsightsCard } from "./ha-insights-card";
import type { AuditLogCall, CardConfig, HassLite } from "./types";

// v1.3.4: register a panel-bundled alias of the card so the panel
// ALWAYS uses the version of HaInsightsCard built INTO this bundle —
// never the (possibly stale) HACS-installed `ha-insights-card` whose
// class registered first and won the `ha-insights-card` name.
//
// Real-install diagnostic on 2026-05-17 confirmed: card v1.3.0+
// added the 🔗 coupling badge to _renderRow, but users on the side
// panel never saw it because the HACS-loaded card (registered first)
// owned the `ha-insights-card` element name. The panel embedded that
// stale class. customElements doesn't allow re-defining a name once
// taken, so the fresh bundled class was silently discarded.
//
// Solution: panel uses `ha-insights-card-bundled`, registered as a
// trivial subclass of the freshly-built HaInsightsCard from this
// bundle. Always current with the integration's panel.js, regardless
// of what HACS has done with the dashboard card.
const PANEL_CARD_TAG = "ha-insights-card-bundled";

/** Domains whose entities can be physically identified — must stay
 *  aligned with `lib/identify_capability.py::identify_capability_for`.
 *  Listing software-only domains (automation, scene, script, calendar,
 *  sensor, etc.) in the Find-Device modal frustrates the user because
 *  the backend returns NONE and the loop reports "no identify method
 *  available". Filter at the source instead. */
const FINDABLE_DOMAINS: ReadonlySet<string> = new Set([
  "light",
  "switch",
  "media_player",
  "siren",
]);

/** Sensor device_classes that respond to deliberate physical
 *  perturbation. Must stay aligned with the keys of
 *  `lib/perturbation_capability.py::_GUIDES`. Touching, breathing
 *  on, or covering one of these sensors produces a state spike
 *  large enough to fingerprint it against siblings. */
const PERTURBABLE_DEVICE_CLASSES: ReadonlySet<string> = new Set([
  "temperature",
  "humidity",
  "carbon_dioxide",
  "illuminance",
  "sound_pressure",
  "moisture",
]);

/** Per-device_class state-delta threshold that counts as a
 *  "detected" spike (touch was you, not ambient drift). Mirrors
 *  `perturbation_capability.py::PerturbationGuide.expected_delta`
 *  scaled down to ~0.5× so a genuine touch reliably exceeds it
 *  but ambient noise doesn't. Used by the Find Device sensor-watch
 *  mode for inline detection without round-tripping to the
 *  perturbation_test WS endpoint. */
const PERTURBATION_DETECTION_THRESHOLDS: Readonly<Record<string, number>> = {
  temperature: 1.0, // °C
  humidity: 5.0, // %RH
  carbon_dioxide: 200.0, // ppm
  illuminance: 100.0, // lx
  sound_pressure: 10.0, // dB
  moisture: 50.0, // %
};

/** Binary-sensor device_classes you can "walk and watch" — wave at
 *  a motion sensor, walk past an occupancy sensor, open a contact
 *  — and the entity flips off→on right then. Card subscribes to
 *  state changes and highlights the first off→on transition. */
const WATCHABLE_BINARY_DEVICE_CLASSES: ReadonlySet<string> = new Set([
  "motion",
  "occupancy",
  "presence",
  "opening",
  "door",
  "window",
  "vibration",
]);

/** Per-domain loop cadence for the panel-level Find Device modal.
 *  Tuned so total fire rate over a long search session looks like
 *  a curious human poking, not a robotic loop. Switches especially
 *  must be slow — many smart-light vendors interpret rapid on/off
 *  cycles as factory-reset triggers (Tuya: 3× in 10 s; Aqara: 5× in
 *  5 s; Hue: 5× in 10 s). Even though the per-fire pattern stays
 *  under those thresholds, looping a 2-toggle burst every 5 s
 *  aggregates to 240+ toggles over 10 minutes — relay-killing and
 *  log-noise. Per-domain cadence keeps the AGGREGATE rate sane. */
const FIND_DEVICE_CADENCE_MS: Readonly<Record<string, number>> = {
  light: 5000,
  media_player: 6000,
  siren: 10000,
  switch: 12000,
};
const FIND_DEVICE_DEFAULT_CADENCE_MS = 5000;

/** Hard safety ceiling on a Find Device session. After this elapses
 *  the loop auto-stops with a toast — covers the case where the
 *  user forgets the modal is open or leaves the tab. 5 minutes is
 *  long enough for any honest search (walk every room) but short
 *  enough that an abandoned session can't accumulate hundreds of
 *  toggles unattended. */
const FIND_DEVICE_MAX_SESSION_MS = 5 * 60 * 1000;
/** Max fires per individual entity before that entity auto-stops
 *  (the rest of the selection keeps going). At 12 s switch cadence
 *  this caps switches at 30 toggles total even if the user never
 *  unchecks them. */
const FIND_DEVICE_MAX_FIRES_PER_ENTITY = 30;
if (!customElements.get(PANEL_CARD_TAG)) {
  customElements.define(
    PANEL_CARD_TAG,
    class extends HaInsightsCard {},
  );
}

export class HaInsightsPanel extends LitElement {
  // HA injects these on panel mount.
  @property({ attribute: false }) hass?: HassLite;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: { path: string; prefix: string };
  @property({ attribute: false }) panel?: { config?: Record<string, unknown> };

  @state() private _search = "";
  @state() private _minConfidence = 0;
  @state() private _sortBy: "confidence" | "age" | "detector" = "confidence";
  @state() private _groupBy:
    | "area"
    | "floor"
    | "integration"
    | "detector"
    | "label"
    | "none" = "none";
  // v1.5.30: panel-side toggle for shadowed insights. We deliberately
  // do NOT suppress these at scan time (a 1000-entity install reported
  // 0 insights when we did — see detectors/__init__.py history-rich
  // comment). The badge tells the user "HA noticed, you already did
  // it"; this toggle lets a power user collapse those rows when they
  // want to focus on net-new patterns. Default OFF (current behavior).
  @state() private _hideAlreadyAutomated = false;
  @state() private _backfillBusy = false;
  @state() private _bulkBusy = false;
  @state() private _scanBusy = false;
  @state() private _rollupBusy = false;
  @state() private _rollupProgress: {
    running: boolean;
    total: number;
    processed: number;
    errors: number;
    timed_out: number;
    current_entity_id: string | null;
    started_ts: number | null;
    finished_ts: number | null;
    window_days: number;
    elapsed_sec?: number;
    eta_sec?: number;
    last_summary?: Record<string, unknown> | null;
  } | null = null;
  private _rollupPollTimer: number | null = null;
  @state() private _recorderStatus: {
    purge_keep_days: number | null;
    oldest_record_age_days: number | null;
    available_window_days: number | null;
    configured_audit_window_days: number | null;
    effective_window_days: number | null;
  } | null = null;
  // v1.1 panel filters — chip-style multi-select. Empty array = no filter.
  // Persisted alongside search/confidence/sort in localStorage.
  @state() private _filterDomains: string[] = [];
  @state() private _filterAreas: string[] = [];
  @state() private _filterDeviceClasses: string[] = [];
  @state() private _filterDetectors: string[] = [];
  // v1.2 Phase 5: floor + integration axes alongside domain/area/dc/detector.
  @state() private _filterFloors: string[] = [];
  @state() private _filterIntegrations: string[] = [];
  // v1.5.28: labels (HA 2024.4+) — user-applied tags that cascade
  // from entity → device → area. A user with `label: outdoor`,
  // `label: critical`, etc. can slice insights by their own taxonomy.
  @state() private _filterLabels: string[] = [];
  // v1.2.1: depth of LLM reasoning for 🤖 Suggest. "concise" is the
  // cheap default (~150 token rules); "indepth" sends a fuller
  // protocol (~600 token rules) for tricky cases. Persists across
  // page loads. Passed through the embedded card config.
  @state() private _auditDepth: "concise" | "indepth" = "concise";
  // Total insight count BEFORE chip filters. The card returns the
  // post-filter count via a property; we maintain the pre-filter count
  // here for the "Showing X of Y" hint in the panel header.
  @state() private _totalInsightCount = 0;
  @state() private _visibleInsightCount = 0;
  // v1.10.4 — diagnostics modal (calls home_insights/export_dev_audit
  // via WS, shows redacted JSON for bug reports + LLM-driven
  // verification). The modal is open when _diagnosticsJson is set;
  // _diagnosticsBusy gates the button while the WS call is in flight.
  @state() private _diagnosticsJson: string | null = null;
  @state() private _diagnosticsBusy = false;
  // v1.10.8 — Find My HA Device feature. Top-level entity picker +
  // looping identifier. Users open from the panel header to locate
  // ANY entity (not just ones surfaced in insights). Same backend as
  // the per-insight 🔆 Identify (home_insights/identify_entity);
  // different entry point. Search box filters live by entity_id /
  // friendly_name; selected entities are added to a "currently
  // identifying" set; loop fires identify on every selected entity
  // every 5s until user clicks "Found them all" / "Stop".
  @state() private _findDeviceOpen = false;
  @state() private _findDeviceSearch = "";
  @state() private _findDeviceSelected: Set<string> = new Set();
  @state() private _findDeviceCount = 0;
  @state() private _findDeviceErrors: Record<string, string> = {};
  private _findDeviceTimer: ReturnType<typeof setInterval> | null = null;
  // Safety ceilings — both the panel-wide elapsed time and the
  // per-entity fire count are gated so an abandoned session can't
  // accumulate hundreds of toggles. See FIND_DEVICE_MAX_SESSION_MS
  // and FIND_DEVICE_MAX_FIRES_PER_ENTITY constants.
  private _findDeviceSessionStartedAt = 0;
  @state() private _findDeviceFireCounts: Record<string, number> = {};
  @state() private _findDeviceSessionElapsedMs = 0;
  // Per-entity user acknowledgement that they UNDERSTAND this entity
  // will be power-cycled (switch toggle / strobe / siren chirp). The
  // backend WS handler refuses to fire power-cycle methods until the
  // card sends confirm_power_cycle=true. Once the user confirms once,
  // we remember it for the duration of the modal session.
  private _findDevicePowerCycleConfirmed: Set<string> = new Set();
  // v1.10.11 — backend may substitute a safer same-device sibling
  // (status LED) for the relay/contactor the user picked. We surface
  // that substitution inline so the user knows "Identifying via
  // light.shelly_plus_1_led instead of switch.shelly_plus_1".
  @state() private _findDeviceSubstitutions: Record<
    string,
    { to: string; reason: string }
  > = {};
  // v1.10.12 — backend may report `vendor_native: true` when the
  // fire used a vendor-specific primitive (ZHA Identify cluster,
  // Z-Wave Indicator CC, LIFX pulse, Yeelight flow, Z2M effect).
  // Card surfaces the method label so users know which primitive
  // is being used.
  @state() private _findDeviceVendorMethods: Record<
    string,
    { label: string; description: string }
  > = {};
  // Snapshot of distinct values present in the loaded insight set.
  // Drives the chip dropdown options. Refreshed on every list reload.
  @state() private _availableDomains: string[] = [];
  @state() private _availableAreas: string[] = [];
  @state() private _availableDeviceClasses: string[] = [];
  @state() private _availableDetectors: string[] = [];
  // v1.2 Phase 5
  @state() private _availableFloors: string[] = [];
  @state() private _availableIntegrations: string[] = [];
  // v1.5.28: distinct labels across the loaded insight set.
  @state() private _availableLabels: string[] = [];
  // Area-id ↔ display-name maps populated from the loaded insight set
  // so chip dropdowns and the per-detector header show friendly labels
  // ("Living Room") instead of opaque registry ids.
  @state() private _areaNameById: Record<string, string> = {};
  @state() private _floorNameById: Record<string, string> = {};
  // Per-detector counts displayed as small chips in the header.
  // Populated from the SAME insight set as the filter chip dropdowns.
  @state() private _detectorCounts: Record<string, number> = {};
  @state() private _toast = "";
  @state() private _auditOpen = false;
  @state() private _auditLog: AuditLogCall[] = [];
  @state() private _auditBusy = false;
  private _toastTimer?: number;
  // Persistent filter storage (v0.8 phase 6). Versioned key so future
  // shape changes can ignore old saved state cleanly.
  private static readonly _STORAGE_KEY = "ha-insights-panel-filters-v1";
  // Schema version embedded INSIDE the stored JSON. Bump when adding /
  // removing / renaming filter state fields. On mismatch we silently
  // discard and start fresh — avoids carrying ghost lists from earlier
  // versions of the panel into a release where the field shape changed.
  private static readonly _STORAGE_SCHEMA_VERSION = 2;

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      min-height: 100vh;
      background: var(--primary-background-color, #f6f7f9);
      color: var(--primary-text-color);
    }
    .header {
      padding: 18px 24px 12px;
      background: var(--app-header-background-color, var(--card-background-color, white));
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      position: sticky;
      top: 0;
      z-index: 4;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .header .titles {
      flex: 1;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 1.6em;
      font-weight: 500;
    }
    .header .sub {
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
    .header .actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .header button.action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      color: var(--primary-text-color);
    }
    .header button.action ha-icon {
      --mdc-icon-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--secondary-text-color);
    }
    .header button.action.primary {
      background: var(--primary-color, #4c6ef5);
      border-color: var(--primary-color, #4c6ef5);
      color: var(--text-primary-color, #fff);
      font-weight: 500;
    }
    .header button.action.primary ha-icon {
      color: var(--text-primary-color, #fff);
    }
    .header button.action:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .header button.action.primary:hover:not(:disabled) {
      filter: brightness(1.08);
      background: var(--primary-color, #4c6ef5);
    }
    .header button.action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .toast {
      position: fixed;
      top: 16px;
      right: 16px;
      background: var(--success-color, #4caf50);
      color: white;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.9em;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    /* v1.10.4: diagnostics modal */
    .diagnostics-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .diagnostics-dialog {
      background: var(--card-background-color, white);
      color: var(--primary-text-color, #212121);
      border-radius: 8px;
      width: min(900px, 100%);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
    }
    .diagnostics-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }
    .diagnostics-close {
      background: none;
      border: none;
      font-size: 1.5em;
      cursor: pointer;
      color: var(--primary-text-color);
      line-height: 1;
    }
    .diagnostics-body {
      padding: 14px 18px;
      overflow: auto;
      flex: 1 1 auto;
    }
    .diagnostics-hint {
      margin: 0 0 12px 0;
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
    .diagnostics-json {
      background: var(--code-editor-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color);
      padding: 12px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85em;
      overflow: auto;
      max-height: 50vh;
      white-space: pre;
    }
    .diagnostics-actions {
      display: flex;
      gap: 8px;
      padding: 12px 18px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      justify-content: flex-end;
    }
    /* v1.10.8: Find My HA Device modal */
    .find-device-dialog { width: min(720px, 100%); }
    .find-device-search {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 6px;
      font-size: 0.95em;
      margin-bottom: 8px;
    }
    .find-device-status {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
    .find-device-list {
      max-height: 360px;
      overflow-y: auto;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      border-radius: 6px;
    }
    .find-device-empty {
      padding: 18px;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .find-device-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 10px;
      cursor: pointer;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.04));
    }
    .find-device-row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .find-device-row:last-child { border-bottom: none; }
    .find-device-row-text {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
    }
    .find-device-eid {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88em;
      color: var(--primary-text-color);
    }
    .find-device-name {
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .find-device-err {
      font-size: 0.8em;
      color: var(--warning-color, #ef6c00);
      margin-top: 2px;
    }
    .find-device-fires {
      font-size: 0.78em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .find-device-substitution {
      font-size: 0.8em;
      color: var(--primary-text-color);
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid var(--success-color, #4caf50);
      background: rgba(76, 175, 80, 0.06);
      border-radius: 2px;
    }
    .find-device-vendor {
      font-size: 0.78em;
      color: var(--primary-text-color);
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid var(--info-color, #3b82f6);
      background: rgba(59, 130, 246, 0.06);
      border-radius: 2px;
    }
    .find-device-watch-hint {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid var(--info-color, #3b82f6);
      background: rgba(59, 130, 246, 0.06);
      border-radius: 2px;
    }
    .find-device-row--perturb .find-device-eid::before,
    .find-device-row--watch .find-device-eid::before {
      /* Emoji icons supplied inline in the template — no extra CSS
         pseudo-content needed; keep the selector for potential
         future per-mode styling. */
    }
    .find-device-row--detected {
      background: rgba(76, 175, 80, 0.08);
      border-left: 3px solid var(--success-color, #4caf50);
    }
    .find-device-truncated {
      padding: 8px;
      font-size: 0.82em;
      color: var(--secondary-text-color);
      text-align: center;
    }
    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 24px;
      background: var(--card-background-color, white);
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      align-items: center;
    }
    .filters input[type="search"] {
      flex: 1 1 280px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .filters input[type="search"]:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    .filters .conf {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
    .filters input[type="range"] {
      width: 140px;
    }
    .filters select {
      padding: 6px 10px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .filters select:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    .body {
      padding: 16px 24px 32px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Audit log section */
    .audit {
      max-width: 1100px;
      margin: 8px auto 32px;
      padding: 12px 24px 16px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
    }
    .audit-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .audit-toggle h3 {
      margin: 0;
      font-size: 1em;
      font-weight: 500;
    }
    .audit-toggle .arrow {
      transition: transform 200ms;
    }
    .audit-toggle.open .arrow {
      transform: rotate(90deg);
    }
    .audit-empty {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      padding: 12px 0 0;
    }
    .audit-list {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
      max-height: 400px;
      overflow-y: auto;
    }
    .audit-list li {
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
      font-size: 0.88em;
    }
    .audit-list li:last-child {
      border-bottom: none;
    }
    .audit-icon {
      width: 1em;
      text-align: center;
    }
    .audit-icon-ok { color: var(--success-color, #2e7d32); }
    .audit-icon-fail { color: var(--error-color, #c62828); }
    .audit-meta {
      color: var(--secondary-text-color);
      font-size: 0.8em;
      margin-top: 2px;
    }
    .audit-bytes {
      font-family: var(--code-font-family, monospace);
      color: var(--secondary-text-color);
      white-space: nowrap;
      font-size: 0.8em;
    }
    .detector-counts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .detector-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color);
      font-size: 0.78em;
      cursor: pointer;
      font-family: inherit;
    }
    .detector-chip:hover {
      background: var(--divider-color, rgba(0, 0, 0, 0.08));
    }
    .detector-chip.is-active {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color);
    }
    .detector-chip-count {
      background: rgba(0, 0, 0, 0.12);
      padding: 0 6px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85em;
    }
    .detector-chip.is-active .detector-chip-count {
      background: rgba(255, 255, 255, 0.25);
    }
    .rollup-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 16px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      font-size: 0.85em;
    }
    .rollup-bar-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .rollup-bar {
      flex: 1 1 200px;
      min-width: 160px;
      height: 8px;
      background: var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 999px;
      overflow: hidden;
    }
    .rollup-bar-fill {
      height: 100%;
      transition: width 300ms ease-out;
      background: var(--primary-color);
    }
    .rollup-bar-fill.is-running {
      background: linear-gradient(
        90deg,
        var(--primary-color) 0%,
        var(--primary-color) 50%,
        rgba(255, 255, 255, 0.4) 100%
      );
      background-size: 200% 100%;
      animation: rollup-shimmer 1.6s linear infinite;
    }
    .rollup-bar-fill.is-done {
      background: var(--success-color, #4caf50);
    }
    @keyframes rollup-shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
    .rollup-stat {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .rollup-stat-done {
      color: var(--success-color, #4caf50);
    }
    .rollup-stat code {
      background: var(--divider-color, rgba(0, 0, 0, 0.08));
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--code-font-family, "Roboto Mono", monospace);
      font-size: 0.9em;
    }
    .rollup-hint {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .rollup-hint strong {
      color: var(--primary-text-color);
    }
    .rollup-hint-warn {
      color: var(--warning-color, #ff9800);
    }
    .rollup-hint-warn strong {
      color: var(--warning-color, #ff9800);
    }
    .rollup-hint-tip {
      margin-top: 4px;
      padding: 6px 8px;
      background: rgba(255, 152, 0, 0.08);
      border-left: 3px solid var(--warning-color, #ff9800);
      border-radius: 4px;
      font-size: 0.95em;
    }
    .rollup-hint-tip code {
      background: rgba(0, 0, 0, 0.08);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: var(--code-font-family, "Roboto Mono", monospace);
    }
    @media (max-width: 600px) {
      .header,
      .filters,
      .body {
        padding-left: 12px;
        padding-right: 12px;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this._loadFilters();
    // Bubble-listen for the embedded card's "insights-loaded" event so we
    // can refresh chip-filter options and the "Showing X of Y" counters
    // without owning the WS list call ourselves.
    this.addEventListener(
      "insights-loaded",
      this._onInsightsLoaded as EventListener,
    );
    // One-shot recorder status read so the rollup section can show
    // the user's real available window without polling.
    void this._fetchRecorderStatus();
    // Cold-poll once in case a rollup is already running when the
    // panel mounts (e.g. user navigated away mid-batch and came back).
    void this._pollRollupProgress();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "insights-loaded",
      this._onInsightsLoaded as EventListener,
    );
    this._stopRollupPoll();
  }

  protected updated(): void {
    // Save on any filter change. Cheap (<1 KB stringify) and synchronous.
    this._saveFilters();
  }

  private _onInsightsLoaded = (e: Event): void => {
    const detail = (e as CustomEvent<{ insights: Array<Record<string, unknown>> }>).detail;
    const insights = detail?.insights ?? [];
    this._totalInsightCount = insights.length;
    // Distinct values populate chip dropdowns. Sorted for stable UI.
    this._availableDomains = [
      ...new Set(insights.map((i) => i.domain).filter((v): v is string => !!v)),
    ].sort();
    this._availableAreas = [
      ...new Set(insights.map((i) => i.area_id).filter((v): v is string => !!v)),
    ].sort();
    this._availableDeviceClasses = [
      ...new Set(
        insights.map((i) => i.device_class).filter((v): v is string => !!v),
      ),
    ].sort();
    this._availableDetectors = [
      ...new Set(insights.map((i) => i.detector).filter((v): v is string => !!v)),
    ].sort();
    this._availableFloors = [
      ...new Set(insights.map((i) => i.floor_id).filter((v): v is string => !!v)),
    ].sort();
    this._availableIntegrations = [
      ...new Set(
        insights.map((i) => i.integration).filter((v): v is string => !!v),
      ),
    ].sort();
    // v1.5.28: distinct labels across insights. Each insight can
    // carry multiple labels (entity + device + area cascade); flatten
    // into a single set.
    this._availableLabels = [
      ...new Set(
        insights.flatMap(
          (i) =>
            Array.isArray((i as { labels?: unknown }).labels)
              ? ((i as { labels: string[] }).labels)
              : [],
        ),
      ),
    ].sort();
    // Build id → friendly-name lookups from the loaded list. The card
    // already carries area_name + floor_name on each row when set;
    // collecting them here keeps chip labels readable.
    const areaNames: Record<string, string> = {};
    const floorNames: Record<string, string> = {};
    for (const i of insights) {
      if (typeof i.area_id === "string" && typeof i.area_name === "string") {
        areaNames[i.area_id] = i.area_name;
      }
      if (typeof i.floor_id === "string" && typeof i.floor_name === "string") {
        floorNames[i.floor_id] = i.floor_name;
      }
    }
    this._areaNameById = areaNames;
    this._floorNameById = floorNames;
    // Per-detector counts for the header chip strip.
    const counts: Record<string, number> = {};
    for (const i of insights) {
      const d = i.detector;
      if (typeof d === "string") counts[d] = (counts[d] ?? 0) + 1;
    }
    this._detectorCounts = counts;
    // Compute visible count by re-applying the same filter the card uses
    // (search + min_confidence + chip filters). Cheap; same N as card.
    const search = this._search.trim().toLowerCase();
    const dom = new Set(this._filterDomains);
    const area = new Set(this._filterAreas);
    const dc = new Set(this._filterDeviceClasses);
    const det = new Set(this._filterDetectors);
    const floor = new Set(this._filterFloors);
    const integ = new Set(this._filterIntegrations);
    this._visibleInsightCount = insights.filter((i) => {
      const conf = (i.confidence as number) ?? 0;
      if (conf < this._minConfidence) return false;
      const title = ((i.title as string) ?? "").toLowerCase();
      if (search && !title.includes(search)) return false;
      if (dom.size > 0 && !(typeof i.domain === "string" && dom.has(i.domain))) return false;
      if (area.size > 0 && !(typeof i.area_id === "string" && area.has(i.area_id))) return false;
      if (dc.size > 0 && !(typeof i.device_class === "string" && dc.has(i.device_class))) return false;
      if (det.size > 0 && !(typeof i.detector === "string" && det.has(i.detector))) return false;
      if (floor.size > 0 && !(typeof i.floor_id === "string" && floor.has(i.floor_id))) return false;
      if (
        integ.size > 0 &&
        !(typeof i.integration === "string" && integ.has(i.integration))
      ) {
        return false;
      }
      return true;
    }).length;
  };

  private _loadFilters(): void {
    try {
      const raw = window.localStorage.getItem(HaInsightsPanel._STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      // Schema-version gate. Drop the saved state if it predates the
      // current schema — better to lose the user's filters than show
      // them stale data they can't see the shape of.
      if (saved.v !== HaInsightsPanel._STORAGE_SCHEMA_VERSION) {
        window.localStorage.removeItem(HaInsightsPanel._STORAGE_KEY);
        return;
      }
      if (typeof saved.search === "string") this._search = saved.search;
      if (typeof saved.minConfidence === "number") {
        this._minConfidence = saved.minConfidence;
      }
      if (saved.sortBy === "confidence" || saved.sortBy === "age" || saved.sortBy === "detector") {
        this._sortBy = saved.sortBy;
      }
      if (
        saved.groupBy === "none" ||
        saved.groupBy === "detector" ||
        saved.groupBy === "area" ||
        saved.groupBy === "floor" ||
        saved.groupBy === "integration" ||
        saved.groupBy === "label"
      ) {
        this._groupBy = saved.groupBy;
      }
      if (typeof saved.auditOpen === "boolean") this._auditOpen = saved.auditOpen;
      if (Array.isArray(saved.filterDomains)) {
        this._filterDomains = saved.filterDomains.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      if (Array.isArray(saved.filterAreas)) {
        this._filterAreas = saved.filterAreas.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      if (Array.isArray(saved.filterDeviceClasses)) {
        this._filterDeviceClasses = saved.filterDeviceClasses.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      if (Array.isArray(saved.filterDetectors)) {
        this._filterDetectors = saved.filterDetectors.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      if (Array.isArray(saved.filterFloors)) {
        this._filterFloors = saved.filterFloors.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      if (Array.isArray(saved.filterIntegrations)) {
        this._filterIntegrations = saved.filterIntegrations.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      // v1.5.28: load labels chip filter from localStorage
      if (Array.isArray(saved.filterLabels)) {
        this._filterLabels = saved.filterLabels.filter(
          (s: unknown): s is string => typeof s === "string",
        );
      }
      // v1.5.30: hide-already-automated toggle
      if (typeof saved.hideAlreadyAutomated === "boolean") {
        this._hideAlreadyAutomated = saved.hideAlreadyAutomated;
      }
      if (saved.auditDepth === "concise" || saved.auditDepth === "indepth") {
        this._auditDepth = saved.auditDepth;
      }
    } catch {
      // Corrupted localStorage entry; fall back to defaults.
    }
  }

  private _saveFilters(): void {
    try {
      window.localStorage.setItem(
        HaInsightsPanel._STORAGE_KEY,
        JSON.stringify({
          v: HaInsightsPanel._STORAGE_SCHEMA_VERSION,
          search: this._search,
          minConfidence: this._minConfidence,
          sortBy: this._sortBy,
          groupBy: this._groupBy,
          auditOpen: this._auditOpen,
          filterDomains: this._filterDomains,
          filterAreas: this._filterAreas,
          filterDeviceClasses: this._filterDeviceClasses,
          filterDetectors: this._filterDetectors,
          filterFloors: this._filterFloors,
          filterIntegrations: this._filterIntegrations,
          filterLabels: this._filterLabels,
          hideAlreadyAutomated: this._hideAlreadyAutomated,
          auditDepth: this._auditDepth,
        }),
      );
    } catch {
      // Quota / private mode; non-fatal
    }
  }

  private _onSearch(e: Event): void {
    this._search = (e.target as HTMLInputElement).value;
  }

  private _onConfidence(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    this._minConfidence = Number.isFinite(value) ? value : 0;
  }

  /** Memoized so Lit's `.config=${...}` binding keeps stable identity across
   *  panel re-renders. Without this, every hass update creates a fresh
   *  config object → setConfig → reactive @state churn on the card. */
  private _cachedCardConfig?: CardConfig;
  private _cachedCardConfigKey?: string;
  private get _embeddedCardConfig(): CardConfig {
    const key =
      `${this._search}|${this._minConfidence}|${this._sortBy}|${this._groupBy}|` +
      `${this._filterDomains.join(",")}|${this._filterAreas.join(",")}|` +
      `${this._filterDeviceClasses.join(",")}|${this._filterDetectors.join(",")}|` +
      `${this._filterFloors.join(",")}|${this._filterIntegrations.join(",")}|` +
      `${this._filterLabels.join(",")}|` +
      `${this._hideAlreadyAutomated ? "1" : "0"}|` +
      `${this._auditDepth}`;
    if (this._cachedCardConfigKey !== key) {
      this._cachedCardConfigKey = key;
      this._cachedCardConfig = {
        type: "custom:ha-insights-card",
        title: this._search ? `Insights matching "${this._search}"` : "All insights",
        // Cap at 200 rows even on the panel. With 1000+ insights the
        // browser locks up rendering all of them; if a user really has
        // 1000+ they should use search/filter to narrow first. The card
        // shows a "showing N of M" hint when the list is truncated.
        max_rows: 200,
        min_confidence: this._minConfidence,
        search: this._search,
        sort_by: this._sortBy,
        group_by: this._groupBy,
        domain_filter: this._filterDomains,
        area_filter: this._filterAreas,
        device_class_filter: this._filterDeviceClasses,
        detector_filter: this._filterDetectors,
        floor_filter: this._filterFloors,
        integration_filter: this._filterIntegrations,
        label_filter: this._filterLabels,
        hide_already_automated: this._hideAlreadyAutomated,
        audit_depth: this._auditDepth,
      };
    }
    return this._cachedCardConfig!;
  }

  private async _runAuditRollup(): Promise<void> {
    if (!this.hass || this._rollupBusy) return;
    this._rollupBusy = true;
    this._rollupLoopAborted = false;
    this._rollupLoopStartTs = Date.now();
    try {
      // v1.2 loop-mode: single click chains batches until all
      // entities are caught up OR a 5-minute ceiling. Each batch
      // is bounded by the backend's 120s budget + single-flight
      // lock, so we're not bypassing safety — just removing the
      // "click 12 times" UX cliff. User can stop via the Stop
      // button which sets _rollupLoopAborted.
      this.hass.connection
        .sendMessagePromise({
          type: "call_service",
          domain: "ha_insights",
          service: "run_audit_rollup",
          service_data: {},
        })
        .catch((err) => {
          this._showToast(
            `Rollup failed to start: ${(err as { message?: string }).message ?? String(err)}`,
          );
        });
      // Kick the poll right away so the bar shows before the first
      // 2-second interval fires.
      await this._pollRollupProgress();
      this._startRollupPoll();
    } finally {
      // _rollupBusy stays sticky until the polled `running` flag
      // turns false in _pollRollupProgress.
    }
  }

  /** Hard ceiling on the auto-chain so a runaway backend can't
   *  loop forever. 5 minutes covers ≥ 1000 entities at typical
   *  rates while bounding worst-case user wait. */
  private static readonly _ROLLUP_LOOP_CEILING_MS = 5 * 60 * 1000;
  private _rollupLoopAborted = false;
  private _rollupLoopStartTs = 0;

  private _stopRollupLoop(): void {
    this._rollupLoopAborted = true;
  }

  private _startRollupPoll(): void {
    if (this._rollupPollTimer !== null) return;
    this._rollupPollTimer = window.setInterval(
      () => void this._pollRollupProgress(),
      2000,
    );
  }

  private _stopRollupPoll(): void {
    if (this._rollupPollTimer !== null) {
      window.clearInterval(this._rollupPollTimer);
      this._rollupPollTimer = null;
    }
  }

  private async _pollRollupProgress(): Promise<void> {
    if (!this.hass) return;
    try {
      const snap = (await this.hass.connection.sendMessagePromise({
        type: "home_insights/rollup_progress",
      })) as NonNullable<typeof this._rollupProgress>;
      this._rollupProgress = snap;
      if (!snap.running) {
        this._rollupBusy = false;
        this._stopRollupPoll();
        if (snap.last_summary && snap.finished_ts) {
          const s = snap.last_summary as {
            entities_processed?: number;
            errors?: number;
            timed_out_entities?: string[];
            batch_duration_sec?: number;
            next_due_count?: number;
            skipped_inflight?: boolean;
          };
          const processed = s.entities_processed ?? 0;
          const remaining = s.next_due_count ?? 0;
          const timedOut = (s.timed_out_entities ?? []).length;
          const elapsedMs = Date.now() - this._rollupLoopStartTs;
          const underCeiling =
            elapsedMs < HaInsightsPanel._ROLLUP_LOOP_CEILING_MS;

          // Loop-mode: if there's still work AND user hasn't
          // stopped AND we're under the 5-min ceiling, chain
          // another batch. Otherwise emit the final toast.
          const shouldChain =
            remaining > 0 &&
            processed > 0 && // forward progress is happening
            !this._rollupLoopAborted &&
            !s.skipped_inflight &&
            underCeiling;

          if (shouldChain) {
            // Restart the next batch + keep polling. Brief courtesy
            // pause lets the recorder breathe between batches.
            window.setTimeout(() => {
              if (!this.hass || this._rollupLoopAborted) return;
              this._rollupBusy = true;
              this.hass.connection
                .sendMessagePromise({
                  type: "call_service",
                  domain: "ha_insights",
                  service: "run_audit_rollup",
                  service_data: {},
                })
                .catch((err) => {
                  this._showToast(
                    `Rollup chain failed: ${(err as { message?: string }).message ?? String(err)}`,
                  );
                  this._rollupBusy = false;
                });
              void this._pollRollupProgress();
              this._startRollupPoll();
            }, 1500);
            return; // don't show terminal toast yet
          }

          let message: string;
          if (s.skipped_inflight) {
            message = "Rollup already running — try again in a moment";
          } else if (processed === 0 && remaining === 0 && timedOut === 0) {
            message = "All audit rollups are already up to date ✓";
          } else if (processed === 0 && timedOut > 0) {
            message = `No progress — ${timedOut} entities timed out, will retry`;
          } else if (remaining === 0) {
            message = `Rollup complete: ${processed} entities caught up · all up to date ✓`;
          } else if (this._rollupLoopAborted) {
            message = `Rollup stopped: ${remaining} entities still queued`;
          } else if (!underCeiling) {
            message = `Rollup hit 5-min ceiling: ${remaining} entities still queued — click again to continue`;
          } else {
            message = `Rollup batch: ${processed} advanced · ${remaining} still need work`;
          }
          if (s.batch_duration_sec) {
            message += ` (${s.batch_duration_sec}s)`;
          }
          this._showToast(message);
        }
      }
    } catch (err) {
      // Endpoint not registered yet (e.g. backend not deployed) — give
      // up quietly. Without this guard the poll would spam errors
      // every 2s on older installs.
      this._stopRollupPoll();
      this._rollupBusy = false;
    }
  }

  private async _fetchRecorderStatus(): Promise<void> {
    if (!this.hass) return;
    try {
      this._recorderStatus = (await this.hass.connection.sendMessagePromise({
        type: "home_insights/recorder_status",
      })) as NonNullable<typeof this._recorderStatus>;
    } catch {
      // Endpoint may not exist on older backends — leave null.
    }
  }

  private async _runBackfill(): Promise<void> {
    if (!this.hass) return;
    this._backfillBusy = true;
    // Backfill triggers a re-scan internally; hide live mutations
    // until both phases complete.
    window.dispatchEvent(new CustomEvent("ha-insights-scan-start"));
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "ha_insights",
        service: "backfill",
        service_data: {},
      });
      // Poll once to get summary
      const status = (await this.hass.connection.sendMessagePromise({
        type: "home_insights/backfill_status",
      })) as { running: boolean; last: { events_added: number; entities_seen: number; lookback_days: number } | null };
      if (status.last) {
        this._showToast(
          `Backfilled ${status.last.events_added} events from ${status.last.entities_seen} entities (${status.last.lookback_days}d)`,
        );
      } else {
        this._showToast("Backfill complete");
      }
      // Trigger a re-scan so detectors run against the new buffer contents
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "ha_insights",
        service: "scan_now",
        service_data: {},
      });
      // Force a card re-fetch so the deduped post-scan view reaches
      // the UI instead of accumulating raw subscribe-stream rows.
      window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
    } catch (err) {
      this._showToast(
        `Backfill failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    } finally {
      this._backfillBusy = false;
    }
  }

  private async _runScanNow(): Promise<void> {
    if (!this.hass || this._scanBusy) return;
    // Use the home_insights/scan_now WS endpoint instead of call_service —
    // it awaits the actual scan completion + returns a count, giving us
    // real "scan finished" feedback. call_service was returning the moment
    // the call was queued, so the user got "Scan complete" instantly while
    // the scan was still running, with no in-progress feedback.
    this._scanBusy = true;
    this._showToast("Scanning…");
    // Tell the embedded card to hide its live insight list behind a
    // "Scanning…" curtain. The subscribe stream still mutates state in
    // the background; the curtain just hides the transient un-deduped
    // view. Cleared by the matching refresh dispatch below.
    window.dispatchEvent(new CustomEvent("ha-insights-scan-start"));
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        detectors_run: string[];
        insights_emitted: number;
        swept_stale?: number;
        suppressed_as_duplicate?: number;
        canceled?: boolean;
      }>({ type: "home_insights/scan_now" });
      const noun = result.insights_emitted === 1 ? "insight" : "insights";
      const verb = result.canceled ? "canceled" : "complete";
      const parts = [
        `Scan ${verb}: ${result.insights_emitted} new ${noun} from ${result.detectors_run.length} detectors`,
      ];
      if (result.swept_stale) {
        parts.push(`${result.swept_stale} stale removed`);
      }
      if (result.suppressed_as_duplicate) {
        parts.push(`${result.suppressed_as_duplicate} dup-of-existing-automation suppressed`);
      }
      this._showToast(parts.join(" · "));
      // Tell the embedded card to re-fetch insights via ws_list. Without
      // this, the card's subscribe stream may have accumulated stale
      // pre-dedup rows from the in-progress scan; ws_list returns the
      // canonical deduped view.
      window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
    } catch (err) {
      this._showToast(
        `Scan failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    } finally {
      this._scanBusy = false;
    }
  }

  private async _cancelScan(): Promise<void> {
    if (!this.hass || !this._scanBusy) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/cancel_scan",
      });
      this._showToast("Stopping scan…");
    } catch (err) {
      this._showToast(
        `Cancel failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    }
  }

  /** Force the browser to pick up a freshly-deployed panel/card bundle.
   *  Two-step: (1) ask the integration to re-register the panel with a
   *  fresh ?v= mtime/size signature so the URL changes; (2) hard-reload
   *  the window so the browser bypasses its HTTP cache + service worker.
   *  Without (1), the URL stays the same and the browser SW keeps the
   *  old bundle. Without (2), the new ?v= is queued but the current tab
   *  is still running old code. Both pieces matter. */
  private async _reloadUi(): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "ha_insights",
        service: "reload_ui",
        service_data: {},
      });
      this._showToast("Reloading bundle…");
      // Give the toast a tick to paint, then force a cache-bypassing
      // reload. `location.reload(true)` is deprecated; the modern path
      // is `location.reload()` after navigating to a query-busted URL.
      window.setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("_reload", String(Date.now()));
        window.location.replace(url.toString());
      }, 200);
    } catch (err) {
      this._showToast(
        `Reload failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    }
  }

  private async _purgeAllInsights(): Promise<void> {
    if (!this.hass) return;
    const confirmed = window.confirm(
      "Delete ALL stored insights from this integration?\n\n" +
      "This wipes the insights table + outbound LLM call audit log. " +
      "Applied-automation history and pseudonym map are preserved. " +
      "Useful when a noisy scan filled the panel with thousands of " +
      "spurious insights — clean slate, click Run Scan Now again."
    );
    if (!confirmed) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "ha_insights",
        service: "purge_observations",
        service_data: {},
      });
      // v1.2.22: explicit "purged" event the card listens for. Sets
      // a 30s suppression window during which new "added" subscribe
      // events are ignored. Without this, the user clicks Purge and
      // immediately sees insights repopulate from the next scan_
      // interval-driven scan — which violates the "I wanted a clean
      // slate" mental model even though the data IS being correctly
      // re-detected.
      window.dispatchEvent(
        new CustomEvent("ha-insights-purged", {
          detail: { suppressionMs: 30_000 },
        }),
      );
      this._showToast(
        "Purged. New detections suppressed for 30s — click Scan now to refresh sooner.",
      );
    } catch (err) {
      this._showToast(
        `Purge failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    }
  }

  /** v1.10.4: fetch the redacted dev-audit bundle and open the modal.
   *
   *  The bundle (see lib/dev_audit.py SCHEMA_VERSION) captures install
   *  signature + per-detector activity + buffer signature + config
   *  fingerprint — all redacted so the user can safely paste it into a
   *  GitHub issue OR into an AI chat asking "are any detectors silent
   *  for the wrong reason?"
   *
   *  Admin-only at the WS layer; the button is only useful for users
   *  who can also access HA Developer Tools. We don't pre-gate visibility
   *  on the card side because non-admin users may legitimately want to
   *  see what's there (the bundle is redacted by design). */
  private async _runDiagnostics(): Promise<void> {
    if (!this.hass) return;
    this._diagnosticsBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: "home_insights/export_dev_audit",
      });
      this._diagnosticsJson = JSON.stringify(result, null, 2);
    } catch (err) {
      this._showToast(
        `Diagnostics failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    } finally {
      this._diagnosticsBusy = false;
    }
  }

  /** Copy the loaded diagnostics JSON to the user's clipboard. Uses the
   *  modern Clipboard API; falls back gracefully when not available
   *  (e.g. running in an insecure context). */
  private async _copyDiagnostics(): Promise<void> {
    if (!this._diagnosticsJson) return;
    try {
      await navigator.clipboard.writeText(this._diagnosticsJson);
      this._showToast(
        "Diagnostics copied to clipboard. Paste into a GitHub issue or your AI chat.",
      );
    } catch (err) {
      this._showToast(
        `Clipboard copy failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    }
  }

  private _closeDiagnostics(): void {
    this._diagnosticsJson = null;
  }

  // ===== v1.10.8 — Find My HA Device =====

  /** Open the Find Device modal. Resets selection + counter so each
   *  session starts clean. */
  private _openFindDevice(): void {
    this._findDeviceOpen = true;
    this._findDeviceSearch = "";
    this._findDeviceSelected = new Set();
    this._findDeviceCount = 0;
    this._findDeviceErrors = {};
  }

  /** Close the modal and clear the recurring identify timer +
   *  any active watch-mode subscriptions. */
  private _closeFindDevice(): void {
    if (this._findDeviceTimer != null) {
      clearInterval(this._findDeviceTimer);
      this._findDeviceTimer = null;
    }
    // Tear down every active state_changed subscription. Each unsub
    // is wrapped so we don't need to await Promises here.
    for (const unsub of this._findDeviceWatchUnsubs.values()) {
      try {
        unsub();
      } catch {
        // best-effort cleanup
      }
    }
    this._findDeviceWatchUnsubs.clear();
    const stoppedWithSelection = this._findDeviceSelected.size > 0;
    this._findDeviceOpen = false;
    this._findDeviceSelected = new Set();
    this._findDeviceErrors = {};
    this._findDeviceCount = 0;
    this._findDeviceFireCounts = {};
    this._findDeviceSessionStartedAt = 0;
    this._findDeviceSessionElapsedMs = 0;
    this._findDevicePowerCycleConfirmed = new Set();
    this._findDeviceSubstitutions = {};
    this._findDeviceVendorMethods = {};
    this._findDeviceWatchBaselines = {};
    this._findDeviceWatchCurrent = {};
    this._findDeviceWatchDetected = new Set();
    if (stoppedWithSelection) {
      this._showToast("🔍 Identification stopped.");
    }
  }

  private _toggleFindDeviceEntity(entityId: string): void {
    const next = new Set(this._findDeviceSelected);
    const state = this.hass?.states?.[entityId];
    const mode = state
      ? this._findDeviceMode(entityId, state)
      : null;
    if (next.has(entityId)) {
      next.delete(entityId);
      const errs = { ...this._findDeviceErrors };
      delete errs[entityId];
      this._findDeviceErrors = errs;
      const counts = { ...this._findDeviceFireCounts };
      delete counts[entityId];
      this._findDeviceFireCounts = counts;
      // Tear down watch-mode subscription if present.
      const unsub = this._findDeviceWatchUnsubs.get(entityId);
      if (unsub) {
        unsub();
        this._findDeviceWatchUnsubs.delete(entityId);
      }
      const baselines = { ...this._findDeviceWatchBaselines };
      delete baselines[entityId];
      this._findDeviceWatchBaselines = baselines;
      const cur = { ...this._findDeviceWatchCurrent };
      delete cur[entityId];
      this._findDeviceWatchCurrent = cur;
      const det = new Set(this._findDeviceWatchDetected);
      det.delete(entityId);
      this._findDeviceWatchDetected = det;
    } else {
      next.add(entityId);
      if (mode === "perturb" || mode === "watch") {
        this._startEntityWatch(entityId, mode);
      }
    }
    this._findDeviceSelected = next;
    // Fire-loop timer only matters when at least one fire-mode entity
    // is selected. Watch-mode entities use HA state subscriptions
    // independently, so an all-watch selection should NOT spin the
    // identify loop unnecessarily.
    const hasFireEntities = Array.from(next).some((eid) => {
      const st = this.hass?.states?.[eid];
      return st && this._findDeviceMode(eid, st) === "fire";
    });
    if (hasFireEntities && this._findDeviceTimer == null) {
      this._findDeviceSessionStartedAt = Date.now();
      this._findDeviceSessionElapsedMs = 0;
      void this._fireFindDeviceOnce();
      this._findDeviceTimer = setInterval(
        () => void this._fireFindDeviceOnce(),
        1000,
      );
    } else if (!hasFireEntities && this._findDeviceTimer != null) {
      clearInterval(this._findDeviceTimer);
      this._findDeviceTimer = null;
      this._findDeviceSessionStartedAt = 0;
      this._findDeviceSessionElapsedMs = 0;
    }
  }

  /** Subscribe to state changes on an entity and watch for a touch
   *  (sensor) or trigger (binary_sensor). Captures a baseline value
   *  on first subscription and stamps `_findDeviceWatchDetected`
   *  once the delta exceeds the per-device_class threshold.
   *
   *  Uses HA's standard `state_changed` event subscription, filtered
   *  client-side by entity_id. No backend endpoint needed — the
   *  card watches the regular state stream the user can already
   *  see in Developer Tools. */
  private _startEntityWatch(
    entityId: string,
    mode: "perturb" | "watch",
  ): void {
    if (!this.hass || this._findDeviceWatchUnsubs.has(entityId)) return;
    const initial = this.hass.states?.[entityId];
    if (mode === "perturb") {
      const baseline = parseFloat(initial?.state ?? "");
      if (Number.isFinite(baseline)) {
        this._findDeviceWatchBaselines = {
          ...this._findDeviceWatchBaselines,
          [entityId]: baseline,
        };
      }
    }
    if (initial) {
      this._findDeviceWatchCurrent = {
        ...this._findDeviceWatchCurrent,
        [entityId]: initial.state,
      };
    }
    const handle = (evt: {
      data?: {
        entity_id?: string;
        new_state?: { state?: string };
      };
    }) => {
      if (evt.data?.entity_id !== entityId) return;
      const newState = evt.data.new_state?.state;
      if (newState === undefined) return;
      this._findDeviceWatchCurrent = {
        ...this._findDeviceWatchCurrent,
        [entityId]: newState,
      };
      if (mode === "perturb") {
        const baseline = this._findDeviceWatchBaselines[entityId];
        const v = parseFloat(newState);
        if (!Number.isFinite(v) || !Number.isFinite(baseline)) return;
        const deviceClass = initial?.attributes?.device_class;
        if (typeof deviceClass !== "string") return;
        const threshold =
          PERTURBATION_DETECTION_THRESHOLDS[deviceClass] ?? 1.0;
        if (Math.abs(v - baseline) >= threshold) {
          const det = new Set(this._findDeviceWatchDetected);
          det.add(entityId);
          this._findDeviceWatchDetected = det;
        }
      } else if (mode === "watch") {
        if (newState === "on") {
          const det = new Set(this._findDeviceWatchDetected);
          det.add(entityId);
          this._findDeviceWatchDetected = det;
        }
      }
    };
    // HassLite types subscribeMessage but not subscribeEvents — the
    // underlying ha-websocket-js connection exposes both. Cast to
    // access subscribeEvents since it's the simpler primitive (just
    // an event type string, vs. a full WS command). Runtime-safe;
    // HA has shipped subscribeEvents since 2020.
    const conn = this.hass.connection as unknown as {
      subscribeEvents: (
        cb: (evt: {
          data?: {
            entity_id?: string;
            new_state?: { state?: string };
          };
        }) => void,
        event: string,
      ) => Promise<() => Promise<void>>;
    };
    void conn.subscribeEvents(handle, "state_changed").then((unsub) => {
      // If the user already unchecked while we were waiting for
      // the subscription to be ready, tear it down immediately.
      if (!this._findDeviceSelected.has(entityId)) {
        void unsub();
        return;
      }
      this._findDeviceWatchUnsubs.set(entityId, () => void unsub());
    });
  }

  /** Timer tick. Runs at 1 s cadence; per-entity cadence is enforced
   *  by checking the entity's last-fire time against its
   *  domain-specific FIND_DEVICE_CADENCE_MS. Hard ceilings auto-stop
   *  individual entities (FIND_DEVICE_MAX_FIRES_PER_ENTITY) and the
   *  whole session (FIND_DEVICE_MAX_SESSION_MS). */
  private _findDeviceLastFiredAt: Record<string, number> = {};
  // v1.10.10 — Passive-sensor watch mode. When the user checks a
  // perturbable sensor (temp / humidity / CO₂ / illuminance / etc.)
  // or a motion / occupancy binary_sensor, we don't fire identify —
  // we subscribe to state changes and watch for a delta (sensors) or
  // off→on transition (binary_sensors). Baseline is captured at
  // first subscription; threshold values from PERTURBATION_DETECTION_THRESHOLDS.
  private _findDeviceWatchUnsubs: Map<string, () => void> = new Map();
  @state() private _findDeviceWatchBaselines: Record<string, number> = {};
  @state() private _findDeviceWatchCurrent: Record<string, string> = {};
  @state() private _findDeviceWatchDetected: Set<string> = new Set();

  /** Format remaining session time as `m:ss`. Hits 0:00 right before
   *  the auto-stop fires, so the toast is the visual confirmation. */
  private _formatFindDeviceRemaining(): string {
    const elapsed = this._findDeviceSessionElapsedMs;
    const remaining = Math.max(0, FIND_DEVICE_MAX_SESSION_MS - elapsed);
    const totalSec = Math.ceil(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  private async _fireFindDeviceOnce(): Promise<void> {
    if (!this.hass || this._findDeviceSelected.size === 0) return;
    const now = Date.now();

    // Session-level safety ceiling. Auto-stop everything after the
    // hard maximum. Toast tells the user why and how to resume.
    if (this._findDeviceSessionStartedAt > 0) {
      this._findDeviceSessionElapsedMs = now - this._findDeviceSessionStartedAt;
      if (this._findDeviceSessionElapsedMs >= FIND_DEVICE_MAX_SESSION_MS) {
        if (this._findDeviceTimer != null) {
          clearInterval(this._findDeviceTimer);
          this._findDeviceTimer = null;
        }
        this._findDeviceSelected = new Set();
        this._findDeviceSessionStartedAt = 0;
        this._showToast(
          "🔍 Auto-stopped after 5 min. Re-check entities to keep looking.",
        );
        return;
      }
    }

    // Pick entities that are DUE to fire this tick based on their
    // per-domain cadence + last-fired timestamp. Also enforces the
    // per-entity fire-count ceiling.
    const due: string[] = [];
    const nextSelected = new Set(this._findDeviceSelected);
    const nextCounts = { ...this._findDeviceFireCounts };
    for (const entityId of this._findDeviceSelected) {
      const fires = nextCounts[entityId] ?? 0;
      if (fires >= FIND_DEVICE_MAX_FIRES_PER_ENTITY) {
        // This entity hit its individual ceiling. Quietly remove
        // it from the active loop — the user still sees the row,
        // can re-check to resume, but the loop stops accumulating
        // toggles on a possibly-abandoned entity.
        nextSelected.delete(entityId);
        continue;
      }
      const domain = entityId.split(".", 1)[0];
      const cadence =
        FIND_DEVICE_CADENCE_MS[domain] ?? FIND_DEVICE_DEFAULT_CADENCE_MS;
      const last = this._findDeviceLastFiredAt[entityId] ?? 0;
      if (last === 0 || now - last >= cadence) {
        due.push(entityId);
      }
    }
    if (nextSelected.size !== this._findDeviceSelected.size) {
      this._findDeviceSelected = nextSelected;
    }
    if (due.length === 0) {
      this._findDeviceFireCounts = nextCounts;
      return;
    }
    type IdentifyResp = {
      method?: string;
      description?: string;
      requires_confirmation?: boolean;
      warning?: string;
      calls_made?: number;
      vendor_native?: boolean;
      substitution?: {
        from: string;
        to: string;
        reason: string;
        rule?: string;
      } | null;
    };
    const results = await Promise.allSettled(
      due.map((entityId) =>
        this.hass!.connection.sendMessagePromise<IdentifyResp>({
          type: "home_insights/identify_entity",
          entity_id: entityId,
          confirm_power_cycle: this._findDevicePowerCycleConfirmed.has(
            entityId,
          ),
        }),
      ),
    );
    const nextErrors = { ...this._findDeviceErrors };
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const entityId = due[i];
      this._findDeviceLastFiredAt[entityId] = now;
      if (r.status === "rejected") {
        const err = r.reason as { message?: string };
        nextErrors[entityId] = err.message ?? String(err);
        // Don't count failed fires against the cap — keyword refusals
        // would otherwise hit 30 instantly and the row would auto-drop
        // before the user noticed the error.
      } else if (r.value.requires_confirmation) {
        // Backend asked for explicit power-cycle confirmation.
        // Synchronous browser confirm() is OK here — modal is already
        // blocking the page, this just adds another layer.
        const warning =
          r.value.warning ??
          `Power-cycle ${entityId}? This will turn it on/off.`;
        const ok = window.confirm(
          `⚠️ Confirm power-cycle\n\n${warning}\n\n` +
            "Click OK to allow. Click Cancel to skip this entity " +
            "(stays in selection but won't fire).",
        );
        if (ok) {
          this._findDevicePowerCycleConfirmed.add(entityId);
          // Don't count this tick; next tick will retry with the
          // confirmation flag set and actually fire.
        } else {
          nextErrors[entityId] = "User declined power-cycle confirmation.";
          // Remove from active loop — keep checkbox visible but
          // don't keep prompting.
          const drop = new Set(this._findDeviceSelected);
          drop.delete(entityId);
          this._findDeviceSelected = drop;
        }
      } else {
        nextCounts[entityId] = (nextCounts[entityId] ?? 0) + 1;
        delete nextErrors[entityId];
        // Cache substitution hint (or clear it) for inline display.
        const sub = r.value.substitution;
        if (sub) {
          this._findDeviceSubstitutions = {
            ...this._findDeviceSubstitutions,
            [entityId]: { to: sub.to, reason: sub.reason },
          };
        } else if (this._findDeviceSubstitutions[entityId]) {
          const next = { ...this._findDeviceSubstitutions };
          delete next[entityId];
          this._findDeviceSubstitutions = next;
        }
        // Cache vendor-native method when the backend used one.
        if (r.value.vendor_native && r.value.method && r.value.description) {
          this._findDeviceVendorMethods = {
            ...this._findDeviceVendorMethods,
            [entityId]: {
              label: r.value.method,
              description: r.value.description,
            },
          };
        } else if (this._findDeviceVendorMethods[entityId]) {
          const next = { ...this._findDeviceVendorMethods };
          delete next[entityId];
          this._findDeviceVendorMethods = next;
        }
      }
    }
    this._findDeviceErrors = nextErrors;
    this._findDeviceFireCounts = nextCounts;
    this._findDeviceCount = this._findDeviceCount + 1;
  }

  /** Decide if an entity is findable via Find Device. Three modes:
   *
   *  - "fire": light / switch / media_player / siren — runs the
   *    backend identify loop (light flash, switch toggle, chime).
   *  - "perturb": sensor with a perturbable device_class — user
   *    touches the sensor, we watch for a state delta.
   *  - "watch": motion / occupancy / contact / vibration binary
   *    sensor — user walks through / opens, we watch for off→on. */
  private _findDeviceMode(
    entity_id: string,
    state: { attributes?: Record<string, unknown> },
  ): "fire" | "perturb" | "watch" | null {
    const domain = entity_id.split(".", 1)[0];
    if (FINDABLE_DOMAINS.has(domain)) return "fire";
    const deviceClass = state.attributes?.device_class;
    if (typeof deviceClass !== "string") return null;
    if (domain === "sensor" && PERTURBABLE_DEVICE_CLASSES.has(deviceClass)) {
      return "perturb";
    }
    if (
      domain === "binary_sensor" &&
      WATCHABLE_BINARY_DEVICE_CLASSES.has(deviceClass)
    ) {
      return "watch";
    }
    return null;
  }

  /** Filter the entity list to entries matching the user's search
   *  string. Case-insensitive substring match on entity_id +
   *  friendly_name. Capped at 100 results so the DOM stays
   *  responsive on installs with thousands of entities.
   *
   *  Three buckets: physically-firable (light/switch/media/siren),
   *  perturbable sensors (temp/humidity/CO₂/etc.), and watchable
   *  binary sensors (motion/occupancy/contact). Software-only
   *  domains (automation/scene/script/calendar) are dropped because
   *  they have no physical presence to locate. */
  private _findDeviceMatches(): Array<{
    entity_id: string;
    friendly_name: string;
    mode: "fire" | "perturb" | "watch";
  }> {
    if (!this.hass?.states) return [];
    const needle = this._findDeviceSearch.trim().toLowerCase();
    const out: Array<{
      entity_id: string;
      friendly_name: string;
      mode: "fire" | "perturb" | "watch";
    }> = [];
    for (const [entity_id, state] of Object.entries(this.hass.states)) {
      const mode = this._findDeviceMode(entity_id, state);
      if (mode === null) continue;
      const friendly =
        (state.attributes?.friendly_name as string | undefined) ?? entity_id;
      if (!needle) {
        out.push({ entity_id, friendly_name: friendly, mode });
      } else {
        const hay = `${entity_id} ${friendly}`.toLowerCase();
        if (hay.includes(needle)) {
          out.push({ entity_id, friendly_name: friendly, mode });
        }
      }
      if (out.length >= 100) break;
    }
    return out.sort((a, b) => {
      // Group by mode (fire first), then alphabetical inside group —
      // helps users find the right entity when many domains match.
      const modeOrder = { fire: 0, perturb: 1, watch: 2 };
      if (a.mode !== b.mode) return modeOrder[a.mode] - modeOrder[b.mode];
      return a.entity_id.localeCompare(b.entity_id);
    });
  }

  /** Bulk-apply all currently-visible insights (after the panel's filters
   *  have been applied). Confirms first because each apply writes a real
   *  automation. Best for power users triaging a backlog after a long
   *  detection run; not exposed on the dashboard card. */
  private async _runBulkApply(): Promise<void> {
    if (!this.hass) return;
    // Pull the same filtered list the embedded card is rendering. We query
    // the WS API directly so the panel doesn't have to peek into the
    // card's internals.
    let visible: Array<{ id: string; title: string; payload_format?: string }> = [];
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        insights: Array<{
          id: string;
          title: string;
          confidence: number;
          payload_format?: string;
        }>;
      }>({ type: "home_insights/list" });
      const search = this._search.trim().toLowerCase();
      visible = result.insights
        .filter((i) => i.confidence >= this._minConfidence)
        .filter((i) => !search || i.title.toLowerCase().includes(search))
        .filter((i) => i.payload_format === "automation");
    } catch (err) {
      this._showToast(
        `Could not list: ${(err as { message?: string }).message ?? String(err)}`,
      );
      return;
    }

    if (visible.length === 0) {
      this._showToast("Nothing to apply (no automation insights match)");
      return;
    }

    const proceed = window.confirm(
      `Apply ${visible.length} insight${visible.length === 1 ? "" : "s"}? `
        + "Each will write a real Home Assistant automation. "
        + "Refined / renamed / edited drafts on individual insights are NOT used "
        + "by bulk apply — only the original detected payload.",
    );
    if (!proceed) return;

    this._bulkBusy = true;
    let succeeded = 0;
    const errors: string[] = [];
    try {
      for (const insight of visible) {
        try {
          await this.hass.connection.sendMessagePromise({
            type: "home_insights/apply",
            insight_id: insight.id,
          });
          succeeded += 1;
        } catch (err) {
          const message =
            (err as { message?: string }).message ?? String(err);
          errors.push(`${insight.title}: ${message}`);
        }
      }
    } finally {
      this._bulkBusy = false;
    }

    if (errors.length === 0) {
      this._showToast(`Applied all ${succeeded}`);
    } else {
      this._showToast(
        `Applied ${succeeded} / ${visible.length}; ${errors.length} error(s) — first: ${errors[0]}`,
      );
    }
  }

  private _showToast(message: string): void {
    this._toast = message;
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => {
      this._toast = "";
    }, 3500);
  }

  private async _toggleAudit(): Promise<void> {
    if (this._auditOpen) {
      this._auditOpen = false;
      return;
    }
    this._auditOpen = true;
    if (this._auditLog.length === 0) {
      await this._loadAuditLog();
    }
  }

  private async _loadAuditLog(): Promise<void> {
    if (!this.hass) return;
    this._auditBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        calls: AuditLogCall[];
      }>({ type: "home_insights/audit_log", limit: 25 });
      this._auditLog = result.calls;
    } catch (err) {
      this._showToast(
        `Audit log failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    } finally {
      this._auditBusy = false;
    }
  }

  private _renderAuditLog(): TemplateResult {
    return html`
      <div class="audit">
        <div
          class="audit-toggle ${this._auditOpen ? "open" : ""}"
          @click=${this._toggleAudit}
        >
          <h3>🛡️ LLM activity (${this._auditLog.length || "—"})</h3>
          <span class="arrow">▶</span>
        </div>
        ${this._auditOpen
          ? this._auditBusy
            ? html`<div class="audit-empty">Loading…</div>`
            : this._auditLog.length === 0
              ? html`<div class="audit-empty">
                  No LLM calls recorded yet. When you click Explain or
                  Refine on an insight, each call lands here.
                </div>`
              : html`
                  <ul class="audit-list">
                    ${this._auditLog.map((c) => this._renderAuditRow(c))}
                  </ul>
                `
          : ""}
      </div>
    `;
  }

  private _renderAuditRow(c: AuditLogCall): TemplateResult {
    const when = new Date(c.timestamp);
    const local = when.toLocaleString();
    const success = c.success === true;
    const fail = c.success === false;
    const icon = success ? "✓" : fail ? "✗" : "·";
    const iconCls = success
      ? "audit-icon-ok"
      : fail
        ? "audit-icon-fail"
        : "";
    const title =
      c.insight_title ?? (c.insight_id ? `[deleted ${c.insight_id.slice(0, 8)}]` : "(unknown insight)");
    return html`
      <li>
        <span class="audit-icon ${iconCls}">${icon}</span>
        <div>
          <div>${title}</div>
          <div class="audit-meta">
            ${local} · ${c.agent} · ${c.redaction_mode}
          </div>
        </div>
        <div class="audit-bytes">
          ↑${c.bytes_sent}b / ↓${c.bytes_received}b
        </div>
      </li>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="titles">
          <h1>HA Insights</h1>
          <div class="sub">
            Patterns the integration noticed in your home — apply, refine, test, or dismiss each.
          </div>
          ${this._renderDetectorCounts()}
        </div>
        <div class="actions">
          <button
            class="action"
            ?disabled=${this._backfillBusy}
            aria-label="Backfill state-event buffer from recorder"
            title="Re-populate the buffer from HA's recorder"
            @click=${this._runBackfill}
          >
            ${this._backfillBusy
              ? "Backfilling…"
              : html`<ha-icon icon="mdi:database-refresh"></ha-icon> Backfill`}
          </button>
          <button
            class="action"
            ?disabled=${this._rollupBusy}
            aria-label="Run audit rollup against recorder history"
            title="Recompute long-term audit rollups (day-of-week / month-of-year buckets) from HA's recorder. Single click chains batches until everything is caught up OR 5-minute ceiling — Stop button interrupts."
            @click=${this._runAuditRollup}
          >
            ${this._rollupBusy
              ? "Rolling up…"
              : html`<ha-icon icon="mdi:calendar-clock"></ha-icon> Run audit rollup`}
          </button>
          ${this._rollupBusy
            ? html`<button
                class="action"
                aria-label="Stop audit rollup loop"
                title="Stop chaining batches. The current batch finishes; no new batch is started."
                @click=${this._stopRollupLoop}
              >
                <ha-icon icon="mdi:stop"></ha-icon> Stop rollup
              </button>`
            : ""}
          <button
            class="action primary"
            ?disabled=${this._scanBusy}
            aria-label="Run all detectors now"
            title="Run all detectors against the current buffer"
            @click=${this._runScanNow}
          >
            ${this._scanBusy
              ? "Scanning…"
              : html`<ha-icon icon="mdi:magnify-scan"></ha-icon> Scan now`}
          </button>
          ${this._scanBusy
            ? html`<button
                class="action"
                aria-label="Stop the in-flight scan"
                title="Stop the in-flight scan after the current detector"
                @click=${this._cancelScan}
              >
                <ha-icon icon="mdi:stop"></ha-icon> Stop
              </button>`
            : ""}
          <button
            class="action"
            aria-label="Reload HA Insights UI"
            title="Re-register the panel with a fresh cache-bust + force browser reload — use after deploying a new ha-insights-card.js / panel.js"
            @click=${this._reloadUi}
          >
            <ha-icon icon="mdi:refresh"></ha-icon> Reload UI
          </button>
          <button
            class="action"
            aria-label="Purge all stored insights"
            title="Delete every stored insight (useful when a noisy scan filled the list)"
            @click=${this._purgeAllInsights}
          >
            <ha-icon icon="mdi:delete-sweep-outline"></ha-icon> Purge all
          </button>
          <button
            class="action"
            ?disabled=${this._diagnosticsBusy}
            aria-label="Export redacted diagnostics bundle"
            title="Capture a redacted snapshot of the install (per-detector activity counts, install signature, config fingerprint). Safe to paste into a GitHub issue or an AI chat to ask 'are any of my detectors silent for the wrong reason?'"
            @click=${this._runDiagnostics}
          >
            ${this._diagnosticsBusy
              ? "Collecting…"
              : html`<ha-icon icon="mdi:magnify-expand"></ha-icon> 🔬 Diagnostics`}
          </button>
          <button
            class="action"
            aria-label="Find a device in your home"
            title="Pick any entity in your install and the integration fires its native identifier (light flash, speaker chime, fan flicker, etc.) every 5 seconds until you click 'Found it!'. Useful for locating an unfamiliar entity like 'light.0x0015...' or 'switch.unnamed_3'."
            @click=${this._openFindDevice}
          >
            <ha-icon icon="mdi:map-search"></ha-icon> 🔍 Find device
          </button>
          <button
            class="action"
            ?disabled=${this._bulkBusy}
            aria-label="Apply every visible automation insight"
            title="Apply every visible automation insight (respects search + confidence filters)"
            @click=${this._runBulkApply}
          >
            ${this._bulkBusy
              ? "Applying…"
              : html`<ha-icon icon="mdi:check-all"></ha-icon> Apply all visible`}
          </button>
        </div>
      </div>
      ${this._renderRollupProgress()}
      <div class="filters">
        <input
          type="search"
          placeholder="Search insights (title)…"
          .value=${this._search}
          @input=${this._onSearch}
        />
        <label class="conf">
          Min confidence: ${Math.round(this._minConfidence * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            .value=${String(this._minConfidence)}
            @input=${this._onConfidence}
          />
        </label>
        <select
          aria-label="Sort by"
          .value=${this._sortBy}
          @change=${(e: Event) =>
            (this._sortBy = (e.target as HTMLSelectElement)
              .value as typeof this._sortBy)}
        >
          <option value="confidence">Sort: Confidence</option>
          <option value="age">Sort: Newest</option>
          <option value="detector">Sort: Detector</option>
        </select>
        <select
          aria-label="Group by"
          .value=${this._groupBy}
          @change=${(e: Event) =>
            (this._groupBy = (e.target as HTMLSelectElement)
              .value as typeof this._groupBy)}
        >
          <option value="none">Group: None</option>
          <option value="detector">Group: Detector</option>
          <option value="area">Group: Area</option>
          <option value="floor">Group: Floor</option>
          <option value="integration">Group: Integration</option>
          <option value="label">Group: Label</option>
        </select>
        <select
          aria-label="Audit suggest analysis depth"
          title="Controls how much reasoning the LLM does on 🤖 Suggest. Concise = ~150 token rules (cheap). In-depth = ~600 token rules with examples (better answers, ~4× input tokens)."
          .value=${this._auditDepth}
          @change=${(e: Event) =>
            (this._auditDepth = (e.target as HTMLSelectElement)
              .value as typeof this._auditDepth)}
        >
          <option value="concise">🤖 Concise (cheap)</option>
          <option value="indepth">🤖 In-depth (4× tokens)</option>
        </select>
        <label
          style="display:inline-flex; align-items:center; gap:6px; font-size:0.9em; cursor:pointer;"
          title="Hide insights that the conflict scanner already marked as covered by an existing automation (🔁 already automated)."
        >
          <input
            type="checkbox"
            .checked=${this._hideAlreadyAutomated}
            @change=${(e: Event) =>
              (this._hideAlreadyAutomated = (e.target as HTMLInputElement).checked)}
          />
          Hide 🔁 already automated
        </label>
      </div>
      ${this._renderChipFilters()}
      <div class="filters" style="padding-top:0; padding-bottom:8px;">
        <span style="font-size:0.85em; color: var(--secondary-text-color);">
          Showing ${this._visibleInsightCount} of ${this._totalInsightCount}
          insight${this._totalInsightCount === 1 ? "" : "s"}
          ${this._anyChipActive()
            ? html`<a
                href="#"
                style="margin-left:8px;"
                @click=${(e: Event) => {
                  e.preventDefault();
                  this._clearChipFilters();
                }}
                >clear filters</a
              >`
            : ""}
        </span>
      </div>
      <div class="body">
        ${this._renderCard()}
      </div>
      ${this._renderAuditLog()}
      ${this._renderDiagnosticsModal()}
      ${this._renderFindDeviceModal()}
      ${this._toast ? html`<div class="toast">${this._toast}</div>` : ""}
    `;
  }

  /** v1.10.8: Find My HA Device modal. Top-level entity picker that
   *  lets users locate ANY entity, not just ones surfaced in insights.
   *
   *  UI:
   *   - Search input (live-filters entities by entity_id / friendly_name)
   *   - Scrollable list capped at 100 results (DOM perf on big installs)
   *   - Each row: checkbox + entity_id (mono) + friendly_name
   *   - Footer: "{N} selected, fired {C} times" + Found / Stop buttons
   *   - Per-entity error pills surface alongside the checkbox row when
   *     a fire fails (entity doesn't support identify, etc.)
   *
   *  Behaviour: checking an entity adds it to the looping fire set;
   *  unchecking removes it. Loop is started/stopped automatically by
   *  _toggleFindDeviceEntity based on set size. No per-entity action
   *  needed — just check, listen, uncheck when found. */
  private _renderFindDeviceModal(): TemplateResult | "" {
    if (!this._findDeviceOpen) return "";
    const matches = this._findDeviceMatches();
    const selectedCount = this._findDeviceSelected.size;
    return html`
      <div class="diagnostics-backdrop" @click=${this._closeFindDevice}>
        <div
          class="diagnostics-dialog find-device-dialog"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="diagnostics-header">
            <strong>🔍 Find a device</strong>
            <button
              class="diagnostics-close"
              aria-label="Close"
              @click=${this._closeFindDevice}
            >×</button>
          </div>
          <div class="diagnostics-body">
            <p class="diagnostics-hint">
              Only entities with a built-in identifier are listed:
              lights (flash / strobe), switches (toggle click), media
              players (chime), sirens (chirp). Automations, scenes,
              and scripts are software constructs — they have no
              physical body to find. Pick any entity below and the
              integration fires its native identifier every 5 seconds
              until you uncheck it.
            </p>
            <p class="diagnostics-hint" style="color: var(--secondary-text-color); font-size: 0.85em;">
              💡 <strong>Passive sensors</strong> (👆 temperature / humidity /
              CO₂ / illuminance / sound / moisture) and <strong>binary
              sensors</strong> (👀 motion / occupancy / contact / vibration)
              are listed here too. Tick one and the row will show its
              live state — touch / wave at / open the device and the
              row turns green when the spike is detected. No services
              fired; just a state-stream watch.
            </p>
            <p class="diagnostics-hint" style="color: var(--secondary-text-color); font-size: 0.85em;">
              ⚠️ <strong>Safety:</strong> sessions auto-stop after 5
              minutes; each entity tops out at 30 fires. Lights pulse
              brightness without power-cycling (safe for Tuya / Aqara /
              Hue, which interpret rapid on/off as pairing-mode
              triggers); switches click twice every 12 s so the
              aggregate looks like a human searching. If a switch is
              hard-wired to a smart bulb, the bulb will flicker too —
              that's how the wiring is, not a bug.
            </p>
            <input
              type="search"
              class="find-device-search"
              placeholder="Search entity_id or friendly_name…"
              .value=${this._findDeviceSearch}
              @input=${(e: Event) =>
                (this._findDeviceSearch = (e.target as HTMLInputElement).value)}
            />
            <div class="find-device-status">
              ${selectedCount} selected · fired ${this._findDeviceCount}
              ${this._findDeviceCount === 1 ? "time" : "times"}
              ${this._findDeviceTimer != null
                ? html` · auto-stop in
                    ${this._formatFindDeviceRemaining()}`
                : ""}
            </div>
            <div class="find-device-list">
              ${matches.length === 0
                ? html`<div class="find-device-empty">No matching entities.</div>`
                : matches.map((m) => {
                    const err = this._findDeviceErrors[m.entity_id];
                    const checked = this._findDeviceSelected.has(m.entity_id);
                    const detected = this._findDeviceWatchDetected.has(
                      m.entity_id,
                    );
                    const baseline =
                      this._findDeviceWatchBaselines[m.entity_id];
                    const current = this._findDeviceWatchCurrent[m.entity_id];
                    const fires = this._findDeviceFireCounts[m.entity_id] ?? 0;
                    const st = this.hass?.states?.[m.entity_id];
                    const deviceClass = st?.attributes?.device_class;
                    const unit = st?.attributes?.unit_of_measurement;
                    return html`
                      <label
                        class="find-device-row find-device-row--${m.mode} ${detected
                          ? "find-device-row--detected"
                          : ""}"
                      >
                        <input
                          type="checkbox"
                          ?checked=${checked}
                          @change=${() =>
                            this._toggleFindDeviceEntity(m.entity_id)}
                        />
                        <div class="find-device-row-text">
                          <span class="find-device-eid">
                            ${m.mode === "perturb"
                              ? "👆 "
                              : m.mode === "watch"
                                ? "👀 "
                                : ""}${m.entity_id}
                          </span>
                          <span class="find-device-name">${m.friendly_name}</span>
                          ${m.mode === "fire" && checked && fires > 0
                            ? html`<span class="find-device-fires"
                                >fired ${fires}/${FIND_DEVICE_MAX_FIRES_PER_ENTITY}</span
                              >`
                            : ""}
                          ${m.mode === "fire" &&
                          checked &&
                          this._findDeviceSubstitutions[m.entity_id]
                            ? html`<span class="find-device-substitution">
                                💡 ${this._findDeviceSubstitutions[m.entity_id].reason}
                              </span>`
                            : ""}
                          ${m.mode === "fire" &&
                          checked &&
                          this._findDeviceVendorMethods[m.entity_id]
                            ? html`<span class="find-device-vendor">
                                ⚡ Vendor primitive:
                                ${this._findDeviceVendorMethods[m.entity_id].description}
                              </span>`
                            : ""}
                          ${m.mode === "perturb" && checked
                            ? html`<span class="find-device-watch-hint">
                                ${detected
                                  ? html`<strong style="color: var(--success-color, #4caf50);">
                                      ✅ Spike detected — this is your sensor!
                                    </strong>`
                                  : html`Touch / breathe on / cover this sensor.
                                      Baseline ${baseline?.toFixed(1) ?? "—"}${unit ?? ""},
                                      now <strong>${current ?? "—"}${unit ?? ""}</strong>`}
                              </span>`
                            : ""}
                          ${m.mode === "watch" && checked
                            ? html`<span class="find-device-watch-hint">
                                ${detected
                                  ? html`<strong style="color: var(--success-color, #4caf50);">
                                      ✅ Triggered — this is the ${deviceClass ?? "sensor"}!
                                    </strong>`
                                  : html`Walk past / open / wave. Current state:
                                      <strong>${current ?? "—"}</strong>`}
                              </span>`
                            : ""}
                          ${err
                            ? html`<span class="find-device-err">${err}</span>`
                            : ""}
                        </div>
                      </label>
                    `;
                  })}
            </div>
            ${matches.length >= 100
              ? html`<div class="find-device-truncated">
                  Showing first 100 — refine your search to narrow.
                </div>`
              : ""}
          </div>
          <div class="diagnostics-actions">
            <button class="action primary" @click=${this._closeFindDevice}>
              ✅ Found them all — close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** v1.10.4: diagnostics modal — shows the redacted dev-audit JSON
   *  with copy-to-clipboard for AI chat / bug reports. Only rendered
   *  when _diagnosticsJson is non-null. */
  private _renderDiagnosticsModal(): TemplateResult | "" {
    if (this._diagnosticsJson === null) return "";
    return html`
      <div class="diagnostics-backdrop" @click=${this._closeDiagnostics}>
        <div
          class="diagnostics-dialog"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="diagnostics-header">
            <strong>🔬 Redacted diagnostics</strong>
            <button
              class="diagnostics-close"
              aria-label="Close"
              @click=${this._closeDiagnostics}
            >×</button>
          </div>
          <div class="diagnostics-body">
            <p class="diagnostics-hint">
              Snapshot of your install — entity counts by domain,
              per-detector activity, config fingerprint. Entity friendly
              names, automation aliases, IPs and lat/long are NOT
              included. Safe to paste into a GitHub issue or an AI chat
              ("are any of my detectors silent for the wrong reason?").
            </p>
            <pre class="diagnostics-json">${this._diagnosticsJson}</pre>
          </div>
          <div class="diagnostics-actions">
            <button
              class="action primary"
              @click=${this._copyDiagnostics}
            >
              <ha-icon icon="mdi:content-copy"></ha-icon>
              Copy to clipboard
            </button>
            <button class="action" @click=${this._closeDiagnostics}>
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _anyChipActive(): boolean {
    return (
      this._filterDomains.length > 0 ||
      this._filterAreas.length > 0 ||
      this._filterDeviceClasses.length > 0 ||
      this._filterDetectors.length > 0 ||
      this._filterFloors.length > 0 ||
      this._filterIntegrations.length > 0 ||
      this._filterLabels.length > 0
    );
  }

  private _clearChipFilters(): void {
    this._filterDomains = [];
    this._filterAreas = [];
    this._filterDeviceClasses = [];
    this._filterDetectors = [];
    this._filterFloors = [];
    this._filterIntegrations = [];
    this._filterLabels = [];
  }

  /** A row of small chips listing each detector and its insight count.
   *  Clicking a chip toggles that detector into / out of the detector
   *  filter — fastest way to "show me only the cooccurrence ones". The
   *  active chip is visually emphasized so you can tell what's filtered. */
  private _renderRollupProgress(): TemplateResult | "" {
    const p = this._rollupProgress;
    const rec = this._recorderStatus;
    // Always render the recorder-window hint row when we have it so
    // users can see what window the rollup will actually fill — even
    // when no batch is in flight.
    let hint: TemplateResult | "" = "";
    if (rec) {
      const cfg = rec.configured_audit_window_days;
      const eff = rec.effective_window_days;
      const keep = rec.purge_keep_days;
      const clamped =
        cfg !== null && eff !== null && eff < cfg;
      hint = html`<div class="rollup-hint">
        ${cfg !== null
          ? html`Audit window: <strong>${cfg}</strong> days configured`
          : ""}
        ${keep !== null
          ? html` · recorder keeps <strong>${keep}</strong> days`
          : ""}
        ${rec.oldest_record_age_days !== null
          ? html` · oldest row
              <strong>${rec.oldest_record_age_days}</strong> days ago`
          : ""}
        ${eff !== null
          ? html` · <span class=${clamped ? "rollup-hint-warn" : ""}
              >effective <strong>${eff}</strong> days${clamped
                ? " (limited by recorder)"
                : ""}</span
            >`
          : ""}
        ${clamped
          ? html`<div class="rollup-hint-tip">
              <strong>Good news:</strong> v1.2 incremental rollup is
              active — once a day is rolled up, its bucket counts
              are kept in HA Insights' own SQLite and
              <em>survive recorder purges</em>. You don't need to
              keep a huge recorder DB to build long-term seasonal
              patterns. Enable
              <code>Auto-refresh audit rollups every 6h</code> in
              Configure and the buckets accumulate over time. The
              effective window above is what's available
              <em>right now</em> for first-time backfill.
              ${keep !== null && keep < 30
                ? html` Default HA recorder retains
                    <strong>${keep}</strong> days — bumping
                    <code>recorder.purge_keep_days</code> in
                    <code>configuration.yaml</code> speeds up the
                    initial backfill but isn't required long term.`
                : ""}
            </div>`
          : ""}
      </div>`;
    }
    if (!p || (!p.running && !p.last_summary)) {
      return hint
        ? html`<div class="rollup-row">${hint}</div>`
        : "";
    }
    const pct =
      p.total > 0 ? Math.min(100, Math.round((p.processed / p.total) * 100)) : 0;
    const eta =
      p.eta_sec !== undefined && p.running
        ? ` · ETA ${this._formatSec(p.eta_sec)}`
        : "";
    const summary = p.running
      ? html`<span class="rollup-stat">
          ${p.processed}/${p.total} (${pct}%) · ${p.window_days}d window${eta}
          ${p.current_entity_id
            ? html` · <code>${p.current_entity_id}</code>`
            : ""}
          ${p.errors ? html` · ${p.errors} err` : ""}
          ${p.timed_out ? html` · ${p.timed_out} timeout` : ""}
        </span>`
      : html`<span class="rollup-stat rollup-stat-done">
          Last run: ${p.processed} done${p.errors ? `, ${p.errors} err` : ""}${p.timed_out ? `, ${p.timed_out} timeout` : ""}
        </span>`;
    return html`<div class="rollup-row">
      <div class="rollup-bar-wrap">
        <div class="rollup-bar">
          <div
            class="rollup-bar-fill ${p.running ? "is-running" : "is-done"}"
            style="width: ${p.running ? pct : 100}%"
          ></div>
        </div>
        ${summary}
      </div>
      ${hint}
    </div>`;
  }

  private _formatSec(s: number): string {
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return r ? `${m}m ${r}s` : `${m}m`;
  }

  private _renderDetectorCounts(): TemplateResult | "" {
    const detectors = Object.keys(this._detectorCounts);
    if (detectors.length === 0) return "";
    const active = new Set(this._filterDetectors);
    // Order by count descending so the noisiest detectors land first.
    detectors.sort(
      (a, b) =>
        (this._detectorCounts[b] ?? 0) - (this._detectorCounts[a] ?? 0),
    );
    return html`<div class="detector-counts">
      ${detectors.map((d) => {
        const count = this._detectorCounts[d] ?? 0;
        const isActive = active.has(d);
        return html`<button
          class="detector-chip ${isActive ? "is-active" : ""}"
          title=${isActive
            ? `Showing only ${d} insights — click to clear`
            : `Filter to ${d} insights only`}
          @click=${() => this._toggleDetectorChip(d)}
        >
          ${d}<span class="detector-chip-count">${count}</span>
        </button>`;
      })}
    </div>`;
  }

  private _toggleDetectorChip(detector: string): void {
    const active = new Set(this._filterDetectors);
    if (active.has(detector)) {
      active.delete(detector);
    } else {
      active.add(detector);
    }
    this._filterDetectors = Array.from(active);
  }

  /** Render a row of multi-select dropdowns for each filter axis.
   *  Each option list is built from the distinct values in the currently-
   *  loaded insight set so we never offer a filter that returns empty
   *  results. Area + Floor use registry display names when available so
   *  the user sees "Kitchen" instead of "kitchen_3a8b…". */
  private _renderChipFilters(): TemplateResult {
    const renderSelect = (
      label: string,
      values: string[],
      selected: string[],
      onChange: (next: string[]) => void,
      labelFor?: (v: string) => string,
    ) => {
      if (values.length === 0) return "";
      return html`<select
        aria-label=${label}
        multiple
        size="1"
        style="min-width:110px;"
        @change=${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          const picked = Array.from(select.selectedOptions).map((o) => o.value);
          onChange(picked);
        }}
      >
        <option value="" ?selected=${selected.length === 0}>
          ${label}: All
        </option>
        ${values.map(
          (v) =>
            html`<option value=${v} ?selected=${selected.includes(v)}>
              ${labelFor ? labelFor(v) : v}
            </option>`,
        )}
      </select>`;
    };
    return html`<div class="filters" style="padding-top:0;">
      ${renderSelect(
        "Domain",
        this._availableDomains,
        this._filterDomains,
        (n) => (this._filterDomains = n),
      )}
      ${renderSelect(
        "Area",
        this._availableAreas,
        this._filterAreas,
        (n) => (this._filterAreas = n),
        (id) => this._areaNameById[id] ?? id,
      )}
      ${renderSelect(
        "Floor",
        this._availableFloors,
        this._filterFloors,
        (n) => (this._filterFloors = n),
        (id) => this._floorNameById[id] ?? id,
      )}
      ${renderSelect(
        "Integration",
        this._availableIntegrations,
        this._filterIntegrations,
        (n) => (this._filterIntegrations = n),
      )}
      ${this._availableLabels.length > 0
        ? renderSelect(
            "Label",
            this._availableLabels,
            this._filterLabels,
            (n) => (this._filterLabels = n),
          )
        : nothing}
      ${renderSelect(
        "Device class",
        this._availableDeviceClasses,
        this._filterDeviceClasses,
        (n) => (this._filterDeviceClasses = n),
      )}
      ${renderSelect(
        "Detector",
        this._availableDetectors,
        this._filterDetectors,
        (n) => (this._filterDetectors = n),
      )}
    </div>`;
  }

  private _renderCard(): TemplateResult {
    // Declarative binding so Lit reuses the SAME card element across panel
    // re-renders. Earlier we created the element imperatively each render,
    // which destroyed the card's internal state mid-refine (modal closed,
    // result discarded). Lit's html template diffs by tag + position; same
    // tag in the same slot = same element preserved.
    // v1.3.4: use the panel-bundled alias (ha-insights-card-bundled)
    // so the panel ALWAYS uses the freshly-built class from this
    // bundle — never a stale HACS-installed ha-insights-card that
    // claimed the element name first.
    return html`
      <ha-insights-card-bundled
        .hass=${this.hass as unknown}
        .config=${this._embeddedCardConfig as unknown}
      ></ha-insights-card-bundled>
    `;
  }
}

// Guard against double-registration — only relevant if a future Lovelace
// resource ever imports this bundle directly (today only the integration
// auto-registers it). Cheap to be safe.
if (!customElements.get("ha-insights-panel")) {
  customElements.define("ha-insights-panel", HaInsightsPanel);
}

// v1.3.1: HA panel-mount recovery — fixes the v1.2.26 observer-scope bug.
//
// Background: v1.2.26 added a MutationObserver scoped to `document.body`,
// intending to detect when HA's `<ha-panel-custom>` wrapper ended up empty
// (either because `panel.config` was lost OR because an `AbortError:
// Transition was skipped` interrupted the mount).
//
// **The bug**: MutationObservers do NOT cross shadow-root boundaries.
// `<ha-panel-custom>` is rendered inside `<home-assistant-main>`'s shadow
// root, never in `document.body`. So the v1.2.26 observer fired on
// unrelated mutations but never on the one mutation that mattered (the
// wrapper being inserted into HA's main shadow root).
//
// Result on user installs: the v1.2.26 initial `tryRecover()` call helped
// in the rare case where the wrapper already existed at module load
// (e.g., navigating back to /ha-insights after a previous visit in the
// same session). But on first navigation post page-load, the wrapper
// hadn't been inserted yet → initial call returned early → observer
// never fired → blank panel persisted until hard refresh.
//
// **v1.3.1 fixes**:
// 1. Observe `home-assistant-main`'s shadowRoot directly once it exists
//    (with a fallback poller for the brief window before HA mounts main).
// 2. Listen for URL changes (popstate + hashchange + a wrapped pushState)
//    so we also try right after every navigation.
// 3. Add a short setInterval backstop for the first 5 seconds after each
//    URL change — covers the AbortError race where HA inserts the
//    wrapper but its mount fails silently.
// 4. Diagnostic counter on `window.__haInsightsPanelRecovery` so future
//    blank-panel reports include "recovery attempted N times".
//
// All idempotent. Scoped to our route only. Zero behavior change when
// HA's mount works correctly.
(function installPanelMountRecovery() {
  type RecoveryState = {
    installed: true;
    attempts: number;
    forcedMounts: number;
    lastAttemptAt: number;
  };
  const RECOVERY_KEY = "__haInsightsPanelRecovery";
  type WinWithRecovery = Window & { [RECOVERY_KEY]?: RecoveryState | boolean };
  const win = window as unknown as WinWithRecovery;
  if (win[RECOVERY_KEY] && (win[RECOVERY_KEY] as RecoveryState).installed) {
    return;  // already installed in this page session
  }
  const state: RecoveryState = {
    installed: true,
    attempts: 0,
    forcedMounts: 0,
    lastAttemptAt: 0,
  };
  win[RECOVERY_KEY] = state;

  type Wrap = HTMLElement & {
    hass?: unknown;
    narrow?: unknown;
    panel?: unknown;
  };

  const findWrapper = (): Wrap | null => {
    const ha = document.querySelector("home-assistant");
    const main = ha?.shadowRoot?.querySelector("home-assistant-main");
    return (main?.shadowRoot?.querySelector("ha-panel-custom") as Wrap)
      ?? null;
  };

  const onRoute = (): boolean => {
    return window.location.pathname.startsWith("/ha-insights");
  };

  // v1.3.3: dedupe pass. If two ha-insights-panel ended up siblings
  // (HA's normal resolver + our recovery both fired), keep the first
  // and remove the rest. Idempotent.
  const dedupePanels = (wrap: Wrap): number => {
    const panels = wrap.querySelectorAll("ha-insights-panel");
    if (panels.length <= 1) return 0;
    let removed = 0;
    for (let i = 1; i < panels.length; i++) {
      panels[i].remove();
      removed += 1;
    }
    // eslint-disable-next-line no-console
    console.info(
      `[ha-insights] removed ${removed} duplicate panel element(s)`,
    );
    return removed;
  };

  // v1.3.5: gate the actual force-mount behind a 600ms grace timer.
  //
  // Why: HA's `<ha-panel-custom>._createPanel` dynamically imports the
  // module and only appends the panel element AFTER the import resolves
  // (~10–50ms on a warm cache). Our `mainObserver` fires the instant HA
  // inserts the empty `<ha-panel-custom>` wrapper into the main shadow
  // root — at which point the wrapper has 0 children because HA's
  // import `.then` hasn't run yet. v1.3.4 tryRecover would observe the
  // empty wrapper and force-mount immediately, then HA's `.then` would
  // append a second copy ~15ms later, which dedupe would clean up.
  // forcedMounts incremented spuriously on every nav even though HA's
  // mount was working.
  //
  // 600ms grace is comfortably above HA's typical mount latency on a
  // warm cache and matches the spirit of the existing 500ms burstOnNav
  // delay. If HA succeeds in the grace window, the deferred check sees
  // a non-empty wrapper and no-ops. If HA genuinely fails, the deferred
  // check force-mounts as before.
  let pendingRecoveryTimer: number | null = null;
  const MOUNT_GRACE_MS = 600;
  const tryRecover = (): void => {
    state.attempts += 1;
    state.lastAttemptAt = Date.now();
    if (!onRoute()) return;
    const wrap = findWrapper();
    if (!wrap) return;
    // v1.3.3: always dedupe first. If HA's resolver mounted alongside
    // our recovery (race), clean up before deciding whether to mount.
    dedupePanels(wrap);
    if (wrap.querySelector("ha-insights-panel")) return;
    if (!customElements.get("ha-insights-panel")) return;
    // Wrapper is empty. Schedule a deferred re-check rather than
    // force-mounting immediately. Idempotent: a pending timer absorbs
    // additional observer hits for the same empty window.
    if (pendingRecoveryTimer !== null) return;
    pendingRecoveryTimer = window.setTimeout(() => {
      pendingRecoveryTimer = null;
      if (!onRoute()) return;
      const w = findWrapper();
      if (!w) return;
      dedupePanels(w);
      if (w.querySelector("ha-insights-panel")) return;  // HA succeeded
      if (!customElements.get("ha-insights-panel")) return;
      const el = document.createElement("ha-insights-panel") as Wrap;
      el.hass = w.hass;
      el.narrow = w.narrow;
      el.panel = w.panel;
      w.appendChild(el);
      state.forcedMounts += 1;
      // Single console line so users sending diagnostics can see we
      // recovered (and how often). Intentionally not behind a debug
      // flag — forced-mount counts are useful evidence in future bug
      // reports.
      // eslint-disable-next-line no-console
      console.info(
        "[ha-insights] panel mount recovered (forced-mount #"
        + `${state.forcedMounts}, attempts=${state.attempts})`,
      );
    }, MOUNT_GRACE_MS);
  };

  // Watch the right shadow root — the one HA actually mutates when it
  // inserts ha-panel-custom. The v1.2.26 observer on document.body
  // could not see this mutation; cross-shadow-boundary observation
  // is not supported by the MutationObserver spec.
  let mainObserver: MutationObserver | null = null;
  const attachShadowObserver = (): void => {
    if (mainObserver) return;
    const ha = document.querySelector("home-assistant");
    const main = ha?.shadowRoot?.querySelector("home-assistant-main");
    const shadow = main?.shadowRoot;
    if (!shadow) return;
    mainObserver = new MutationObserver(() => tryRecover());
    mainObserver.observe(shadow, { childList: true, subtree: true });
  };

  // The home-assistant-main shadow root may not exist at module load.
  // Poll briefly until it does, then stop. (Bounded — gives up after
  // 30s; production HA mounts main in <2s on any healthy install.)
  const start = Date.now();
  const shadowPoller = window.setInterval(() => {
    if (mainObserver || Date.now() - start > 30_000) {
      window.clearInterval(shadowPoller);
      return;
    }
    attachShadowObserver();
  }, 250);

  // On URL change → one tryRecover. v1.3.5: tryRecover now self-gates
  // with a 600ms grace timer, so we no longer need the 5s × 250ms
  // polling burst. A single call schedules the deferred check; if HA's
  // normal mount succeeds in the grace window, the deferred check
  // no-ops. The mainObserver covers the case where HA mounts the
  // wrapper after this nav event but before our deferred check fires.
  const burstOnNav = (): void => {
    if (!onRoute()) return;
    tryRecover();
  };

  // Wrap history.pushState so we hear about programmatic navigation
  // (HA uses Vaadin Router which calls pushState; vanilla popstate
  // alone misses these).
  const origPush = window.history.pushState.bind(window.history);
  window.history.pushState = function (...args) {
    const result = origPush(...args);
    window.dispatchEvent(new Event("ha-insights:navigated"));
    return result;
  };
  window.addEventListener("ha-insights:navigated", burstOnNav);
  window.addEventListener("popstate", burstOnNav);
  window.addEventListener("hashchange", burstOnNav);

  // v1.3.3: skip the immediate-at-module-load tryRecover() (v1.3.1
  // ran one synchronously, which raced HA's normal mount on the very
  // first /ha-insights visit and produced two stacked panels). The
  // burst starts immediately but its first probe is delayed 500ms,
  // giving HA the chance to mount normally. If HA succeeds, the
  // dedupe + early-return guard skip our mount entirely. If HA
  // fails, recovery kicks in after the delay.
  burstOnNav();
})();

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-panel": HaInsightsPanel;
  }
}
