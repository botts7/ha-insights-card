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

import "./ha-insights-card";
import type { AuditLogCall, CardConfig, HassLite } from "./types";

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
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      color: var(--primary-text-color);
    }
    .header button.action:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
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
            ${this._backfillBusy ? "Backfilling…" : "🔄 Backfill"}
          </button>
          <button
            class="action"
            ?disabled=${this._rollupBusy}
            aria-label="Run audit rollup against recorder history"
            title="Recompute long-term audit rollups (day-of-week / month-of-year buckets) from HA's recorder. Single click chains batches until everything is caught up OR 5-minute ceiling — Stop button interrupts."
            @click=${this._runAuditRollup}
          >
            ${this._rollupBusy ? "Rolling up…" : "📅 Run audit rollup"}
          </button>
          ${this._rollupBusy
            ? html`<button
                class="action"
                aria-label="Stop audit rollup loop"
                title="Stop chaining batches. The current batch finishes; no new batch is started."
                @click=${this._stopRollupLoop}
              >
                ⏹ Stop rollup
              </button>`
            : ""}
          <button
            class="action"
            ?disabled=${this._scanBusy}
            aria-label="Run all detectors now"
            title="Run all detectors against the current buffer"
            @click=${this._runScanNow}
          >
            ${this._scanBusy ? "Scanning…" : "🔍 Scan now"}
          </button>
          ${this._scanBusy
            ? html`<button
                class="action"
                aria-label="Stop the in-flight scan"
                title="Stop the in-flight scan after the current detector"
                @click=${this._cancelScan}
              >
                ⏹ Stop
              </button>`
            : ""}
          <button
            class="action"
            aria-label="Reload HA Insights UI"
            title="Re-register the panel with a fresh cache-bust + force browser reload — use after deploying a new ha-insights-card.js / panel.js"
            @click=${this._reloadUi}
          >
            🔄 Reload UI
          </button>
          <button
            class="action"
            aria-label="Purge all stored insights"
            title="Delete every stored insight (useful when a noisy scan filled the list)"
            @click=${this._purgeAllInsights}
          >
            🗑 Purge all
          </button>
          <button
            class="action"
            ?disabled=${this._bulkBusy}
            aria-label="Apply every visible automation insight"
            title="Apply every visible automation insight (respects search + confidence filters)"
            @click=${this._runBulkApply}
          >
            ${this._bulkBusy ? "Applying…" : "✓ Apply all visible"}
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
      ${this._toast ? html`<div class="toast">${this._toast}</div>` : ""}
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
    return html`
      <ha-insights-card
        .hass=${this.hass as unknown}
        .config=${this._embeddedCardConfig as unknown}
      ></ha-insights-card>
    `;
  }
}

// Guard against double-registration — only relevant if a future Lovelace
// resource ever imports this bundle directly (today only the integration
// auto-registers it). Cheap to be safe.
if (!customElements.get("ha-insights-panel")) {
  customElements.define("ha-insights-panel", HaInsightsPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-panel": HaInsightsPanel;
  }
}
