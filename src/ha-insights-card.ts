/**
 * HA Insights Lovelace card.
 *
 * Lists insights from the home_insights integration via the stable WS API,
 * subscribes for live updates, and opens a modal dialog for details +
 * Apply / Dismiss / Snooze / Explain / TTS actions. Compact rows so the
 * card stays a fixed height regardless of how many insights are open.
 */
import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

import "./ha-insights-card-editor";
// v1.2.6 — Self-contained bulk-area-assign dialog. Designed to be
// portable into HA core (only standard config-registry WS APIs, no
// dependency on the HA Insights backend). See dialogs/ for details.
import "./dialogs/bulk-area-assign-dialog";
import type {
  CardConfig,
  ExplainResult,
  HassLite,
  HelloResult,
  Insight,
  PrivacyMode,
  RedactionPreview,
  RefineResult,
  RefinedState,
  SubscribeEvent,
  TestActionsResult,
} from "./types";

const CARD_PROTOCOL_VERSION = 1;
const DEFAULT_MAX_ROWS = 8;

export class HaInsightsCard extends LitElement {
  @property({ attribute: false }) hass?: HassLite;
  @state() private _config: CardConfig = { type: "custom:ha-insights-card" };
  @state() private _hello?: HelloResult;
  @state() private _insights: Insight[] = [];
  @state() private _error?: string;
  /** Errors that originated inside the open dialog should stay scoped there
   * (refine validation failures, LLM rate limits, etc), not bleed back to
   * the main card where they'd hide the rows. */
  @state() private _modalError?: string;
  // v1.2.9: `_loading` removed. It was a lifecycle flag that could
  // get stuck (WS hang, missed update, etc.) and produced a blank
  // "Loading…" curtain — the worst kind of UX failure (you don't
  // know if it's broken or just slow). The card now renders based
  // on the data it actually has: insights, _hello (server contact),
  // _error (visible failure). Empty data + no error = empty state
  // with a "Run scan now" CTA, not a stuck curtain. Mirrors how
  // every native HA panel handles this — they never show "Loading…"
  // as a terminal state, only as a transient indicator at most.
  // True while a scan is in flight — render method shows a "Scanning…"
  // curtain instead of the live-mutating insight list. Cleared by the
  // ha-insights-refresh handler (which also fetches the canonical
  // post-scan view).
  @state() private _scanInProgress = false;
  @state() private _busyId?: string;
  @state() private _toast?: string;
  @state() private _dialogId?: string;
  @state() private _explainBusy = false;
  // Per-insight busy flag for the audit_suggest LLM call. Distinct
  // from Refine so an in-flight suggest on one row doesn't disable
  // refine on another.
  @state() private _auditSuggestBusy: string | null = null;
  // v1.2.27 Suggested-Additions state. `_suggestAddBusy` tracks the insight_id
  // whose candidate fetch is in flight (drives the pill's loading state).
  // `_suggestAddDialog` holds the modal's working set when open: the
  // candidate list as returned by the backend, the user's checkbox
  // selection, and the apply-in-flight flag. Closing the modal resets it
  // to undefined; the next open is a fresh fetch.
  @state() private _suggestAddBusy: string | null = null;
  @state() private _suggestAddDialog:
    | {
        insightId: string;
        insightTitle: string;
        candidates: Array<{
          entity_id: string;
          tier: "HIGH" | "MEDIUM" | "LOW" | string;
          reasons: string[];
          category: string;
        }>;
        requiredEids: string[];
        selected: Set<string>;
        applying: boolean;
        error?: string;
      }
    | undefined = undefined;
  @state() private _ttsBusy = false;
  // v1.2.28: History view toggle. When true, ws_list is called with
  // include_retired/include_dismissed/include_snoozed=true so the
  // user can see and (un-)retire their prior lifecycle decisions.
  // Default OFF — day-to-day view stays clean.
  @state() private _showHistory = false;
  @state() private _refineBusy = false;
  /** v0.9 phase 6: ephemeral hypothesis text per anomaly id. Not persisted. */
  @state() private _hypothesisById = new Map<string, string>();
  @state() private _hypothesizeBusy = false;
  /** v1.0 RC #2: per-insight Conversation API thread id, so consecutive
   * Refines on the same insight maintain agent context. Cleared on
   * Apply / Keep Original / explicit "Reset conversation". */
  @state() private _refineConversationById = new Map<string, string>();
  /** v1.0 RC #2: per-insight Refine turn counter for UI display. */
  @state() private _refineTurnsById = new Map<string, number>();
  @state() private _testBusy = false;
  @state() private _scanBusy = false;
  /** Per-insight refined preview held in card state until Apply or Keep Original. */
  @state() private _refinedById = new Map<string, RefinedState>();
  /** Per-insight alias/description rename edits, applied as payload_override on Apply. */
  @state() private _renameEdits = new Map<string, { alias?: string; description?: string }>();
  /** Per-insight in-progress follow-up feedback for the next Refine call. */
  @state() private _feedbackById = new Map<string, string>();
  /** Per-insight free-form JSON edits to the payload (v0.8 phase 3). */
  @state() private _payloadEditsById = new Map<string, string>();
  /** Set of insight ids currently in edit mode. */
  @state() private _editingPayloadFor = new Set<string>();
  /** Per-insight parse error from the last Apply attempt (e.g. "Invalid JSON"). */
  @state() private _payloadParseErrorById = new Map<string, string>();
  /** Per-insight redaction preview state — shown when user clicks "What gets sent?" */
  @state() private _previewById = new Map<string, RedactionPreview>();
  @state() private _previewBusy = false;
  /** v1.10.4: in-flight flag for the 🔆 Identify-this-entity button in
   *  the detail-dialog. Used to disable the button while the WS round-
   *  trip is in progress. Single boolean (not per-insight) because only
   *  one identify can fire at a time per dialog.
   *
   *  v1.10.7 — superseded by the looping modal below. Kept here so any
   *  legacy callers don't error. */
  @state() private _identifyBusy = false;
  /** v1.10.7: looping-identify modal state. Pre-v1.10.7 the Identify
   *  button fired once and showed a toast — many devices flash too
   *  quickly to find, and the toast disappeared while users were
   *  still searching. v1.10.7 wraps the action in a modal that fires
   *  the identifier every IDENTIFY_INTERVAL_MS until the user clicks
   *  "Found it!" or "Stop". */
  @state() private _identifyOpen = false;
  @state() private _identifyEntityId = "";
  @state() private _identifyMethod = "";
  @state() private _identifyCount = 0;
  @state() private _identifyError = "";
  /** v1.10.7: Set of entity_ids currently being identified. Cohort or
   *  multi-entity insights (lagged_correlation pairs,
   *  physical_device_link pairs, cohort_members lists) surface every
   *  referenced entity as a checkbox in the modal — user toggles them
   *  off as they find each physical device. The recurring timer fires
   *  identify on every entity still in this set. */
  @state() private _identifySelected: Set<string> = new Set();
  @state() private _identifyAllEntities: string[] = [];
  private _identifyTimer: ReturnType<typeof setInterval> | null = null;
  /** v1.10.6: BLE live-find state. Populated when user clicks the
   *  📡 BLE find button in the insight detail-dialog. Subscription
   *  delivers per-scanner RSSI updates; modal shows latest reading +
   *  trend arrow so the user can wave their phone around and watch the
   *  signal get stronger/weaker. */
  @state() private _bleFindOpen = false;
  @state() private _bleFindEntity = "";
  @state() private _bleFindAddress = "";
  @state() private _bleFindLatest: {
    rssi_raw: number;
    rssi_smoothed: number;
    scanner: string;
    received_at: number;
  } | null = null;
  @state() private _bleTrendBuffer: number[] = [];
  @state() private _bleFindError = "";
  private _bleFindUnsub: (() => void) | null = null;
  /** Latest test_actions result, shown as an inline panel in the dialog. */
  @state() private _testResults?: { ran: number; error_count: number; results: TestActionsResult["results"]; tested: "original" | "refined" };
  /** v1.1 Refine-existing-automation modal state. Separate from the
   *  per-insight dialog because we're not in an insight context here —
   *  user clicked the ✏️ icon on a 🔁/🤖 pill. Carries the loaded
   *  automation, the in-progress feedback, and the refined diff after
   *  the LLM round-trip. Set undefined while closed. */
  /** v1.1: insight ids whose cohort_members list is currently shown
   *  expanded. Click "▸ show N" to toggle. Per-row state; not persisted. */
  @state() private _expandedCohorts: Set<string> = new Set();
  @state() private _refineAutomationModal?: {
    automationId: string;
    alias: string;
    originalYaml?: string;
    feedback: string;
    busy: boolean;
    error?: string;
    refinedYaml?: string;
    refinedConfig?: Record<string, unknown>;
    rationale?: string | null;
    diffSummary?: string[];
    bytesSent?: number;
    bytesReceived?: number;
    /** v1.1.3: source of the current refined YAML. "deterministic"
     *  came from the Phase B.5 algorithm (free); "llm" came from
     *  the Suggest endpoint (cost tokens); "stage-two" means LLM
     *  refined on top of an earlier deterministic result. The footer
     *  uses this to show the right "take it further" button. */
    refinedSource?: "deterministic" | "llm" | "stage-two";
    /** Audit insight id, when the modal was opened from an audit
     *  row. Drives the "🤖 Refine further" button — sends the
     *  current refinedConfig as `seed_config` so the LLM builds on
     *  top of what's already there instead of starting from scratch. */
    auditInsightId?: string;
  };
  /** v1.2.6 — Open flag for the standalone <bulk-area-assign-dialog>
   *  component. State lives INSIDE the dialog (so it's portable to HA
   *  core); the card just toggles the open flag. */
  @state() private _bulkAreaAssignOpen = false;
  /**
   * v0.5: rows that fit in the card's currently-rendered height. Updated
   * by ResizeObserver. Used as the row cap when the user hasn't set
   * max_rows explicitly. -1 means "not yet measured; use the default."
   */
  @state() private _autoMaxRows = -1;
  // Populated by _filtered() — the total count BEFORE the max_rows
  // cap is applied. Used by _renderCompactTile so the dashboard tile
  // reports the true number of insights even when the cap clips the
  // rendered list to e.g. 1 row.
  @state() private _totalFilteredCount = 0;

  private _unsub?: () => void;
  // v1.2.13: re-entry guard for `_wire()`. Both connectedCallback (the
  // re-mount recovery added in v1.2.13) and `updated(changedProps)` can
  // race to fire `_wire()` within the same microtask if Lit reassigns
  // hass during element re-attachment. Without a guard we'd open two
  // subscriptions, leak the first `_unsub`, and double-handle events.
  private _wiring = false;
  // v1.2.22: post-purge suppression. Set by `ha-insights-purged` window
  // event. While Date.now() < this value, "added" subscribe events are
  // ignored so the user sees a true empty state. The integration's
  // periodic scan continues running in the background — when the
  // suppression window expires, any insights detected since then will
  // flow in normally on the next event.
  private _suppressAddedUntil = 0;
  private _toastTimer?: number;
  private _resizeObserver?: ResizeObserver;
  private _keydownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this._dialogId) {
      this._closeDialog();
    }
  };

  // v1.2.9: `_wired` removed. Used to gate the initial fetch, but
  // it was also a "we've talked to HA" signal we tracked manually —
  // which can drift from reality (subscription died but flag still
  // says wired). Replaced by checking `this._hello` directly: the
  // hello-response object IS the signal that we successfully talked
  // to the integration. If hello is undefined, we haven't fetched
  // yet; if it's set, we have. Single source of truth, can't drift.
  //
  // `_resumeCleanups` + `_installResumeHandlers` removed. HA's
  // home-assistant-js-websocket auto-reconnects on WS drop and
  // auto-resubscribes subscribeMessage handles. The visibility-
  // change handler we added in v1.2.2 was working around a problem
  // that only appeared because our `_loading` flag could stick —
  // with `_loading` gone, there's no stuck state to recover from.
  // Subscription events flow back in naturally on WS resume.

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 0;
      overflow: hidden;
    }
    .header {
      padding: 12px 16px 8px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .header .titles {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-size: 1.2em;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .header a.view-all {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      font-weight: 500;
      color: var(--primary-color);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      min-height: 24px;
      transition: background 120ms, border-color 120ms;
    }
    .header a.view-all:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-color: var(--primary-color);
    }
    .header a.view-all ha-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
    /* v1.2.28 — History toggle button. Same chrome as view-all so the
       two sit together cleanly in the header. Active state uses the
       warning color so the user sees "you're looking at history" at a
       glance. */
    .header .history-toggle {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      font-weight: 500;
      background: transparent;
      color: var(--primary-color);
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      min-height: 24px;
      cursor: pointer;
      transition: background 120ms, border-color 120ms;
    }
    .header .history-toggle:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-color: var(--primary-color);
    }
    .header .history-toggle.history-toggle-on {
      background: var(--warning-color, #f9a825);
      color: rgba(0, 0, 0, 0.78);
      border-color: var(--warning-color, #f9a825);
    }
    /* v1.2.28 — Retire action button. Same chrome as other .action
       buttons but a muted border treatment so it reads "permanent /
       advanced" relative to Dismiss / Snooze. Not destructive enough
       to warrant a red color (it's reversible via the history view). */
    button.action.retire {
      border-style: dashed;
    }
    button.action.retire:hover:not(:disabled) {
      border-style: solid;
      border-color: var(--warning-color, #f9a825);
    }
    /* v1.2.3 — "Showing N of M — +X more →" footer for capped tiles */
    .truncation-footer {
      display: block;
      padding: 8px 16px;
      text-align: center;
      font-size: 0.85em;
      color: var(--primary-color);
      text-decoration: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      transition: background 120ms;
    }
    .truncation-footer:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    /* Compact tile: single row, full-width clickable */
    .compact-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      cursor: pointer;
      transition: background 120ms;
      text-decoration: none;
      color: inherit;
    }
    .compact-tile:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .compact-tile .count {
      font-size: 1.4em;
      font-weight: 500;
    }
    .compact-tile .label {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .compact-tile .arrow {
      font-size: 1.2em;
      color: var(--primary-color);
    }
    .skew-banner {
      background: var(--warning-color, #ff9800);
      color: white;
      padding: 8px 16px;
      font-size: 0.85em;
    }
    .empty,
    .error {
      padding: 24px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .empty-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .empty-scanning {
      padding: 56px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-scanning .empty-sub {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: ha-insights-spin 0.8s linear infinite;
    }
    @keyframes ha-insights-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .empty-actions a,
    .empty-actions button {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      color: var(--primary-text-color);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      font-size: 0.9em;
      text-decoration: none;
    }
    .empty-actions a:hover,
    .empty-actions button:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .empty-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .error {
      color: var(--error-color, #f44336);
    }
    .toast {
      background: var(--success-color, #4caf50);
      color: white;
      padding: 8px 16px;
      font-size: 0.85em;
    }
    .error-banner {
      background: var(--error-color, #f44336);
      color: white;
      padding: 10px 16px;
      font-size: 0.85em;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .error-banner button {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      flex-shrink: 0;
    }
    .error-banner button:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75em;
      font-weight: 500;
      vertical-align: middle;
    }
    .badge-off {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.08));
      color: var(--secondary-text-color);
    }
    .badge-local {
      background: rgba(76, 175, 80, 0.18);
      color: var(--success-color, #2e7d32);
    }
    .badge-cloud {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    /* Group section header (v0.7) */
    .group-header {
      padding: 10px 16px 4px;
      font-size: 0.78em;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
    }
    .row {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: background 120ms;
    }
    .row:last-child {
      border-bottom: none;
    }
    .row {
      position: relative;
    }
    .row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
    }
    .row:hover::before {
      content: "";
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background: var(--primary-color);
      border-radius: 1px;
    }
    .row-title {
      font-weight: 500;
    }
    .row-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    /* v1.2.25: tiered meta — primary pills carry actionable state
       (confidence, applied, conflict, maturity, device-managed); secondary
       text carries identity context (detector, area, integration, age). */
    .row-meta-primary {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .row-meta-secondary {
      font-size: 0.78em;
      color: var(--secondary-text-color);
      opacity: 0.85;
      line-height: 1.4;
    }
    .row-meta-secondary .sep {
      margin: 0 6px;
      opacity: 0.4;
    }
    .pill {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      padding: 2px 8px;
      border-radius: 10px;
    }
    /* v1.1: pill + ✏️ Refine action button cluster — keeps the pill
       and its sibling button visually adjacent without disturbing
       the row's existing pill flow. */
    .automation-pill-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .pill-action {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      padding: 1px 6px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.95em;
      color: var(--secondary-text-color);
    }
    .coupling-badge {
      cursor: help;
      background: var(--info-color, #4a90e2);
      color: var(--text-primary-color, #fff);
      border-color: var(--info-color, #4a90e2);
      opacity: 0.85;
    }
    .coupling-badge:hover {
      opacity: 1.0;
    }
    /* v1.12.11: "newly added" badge. Sky-blue background to read as
       informational, not warning — the entity isn't broken, just new. */
    .entity-age-badge {
      cursor: help;
      background: var(--info-color, #4a90e2);
      color: var(--text-primary-color, #fff);
      border-color: var(--info-color, #4a90e2);
      opacity: 0.80;
    }
    .entity-age-badge:hover {
      opacity: 1.0;
    }
    .pill-action:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    }
    /* Multi-link pill expander. <details> handles open/close; we only
       need to suppress the default disclosure triangle (Firefox) and
       style the popout list. */
    .automation-pill-details {
      display: inline-block;
      vertical-align: middle;
    }
    .automation-pill-details > summary {
      display: inline-block;
    }
    .automation-pill-details > summary::-webkit-details-marker {
      display: none;
    }
    .automation-pill-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
      padding: 8px 10px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      min-width: 220px;
      max-width: 380px;
    }
    .automation-pill-row {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: space-between;
    }
    .automation-pill-link {
      color: var(--primary-color);
      text-decoration: none;
      font-size: 0.9em;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .automation-pill-link:hover {
      text-decoration: underline;
    }
    /* v1.1 audit findings — collapsible per-observation list shown
       under audit-row titles. Indented + secondary background so it
       reads as supporting detail, not another row. */
    .audit-findings {
      margin: 6px 0 8px 14px;
      padding: 8px 12px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border-left: 3px solid var(--primary-color);
      border-radius: 0 6px 6px 0;
      font-size: 0.9em;
    }
    .audit-findings ul {
      margin: 0;
      padding-left: 18px;
    }
    .audit-findings li {
      margin: 2px 0;
    }
    .audit-findings .audit-fixes {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      color: var(--success-color, #2e7d32);
    }
    .audit-findings .audit-fixes strong {
      display: block;
      margin-bottom: 2px;
    }
    /* v1.1: cohort expansion — list of merged entity_ids */
    .cohort-members {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cohort-member-chip {
      font-family: var(--code-font-family, monospace);
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--secondary-text-color);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cohort-member-id {
      /* The entity_id keeps the monospace look from the parent */
    }
    .cohort-member-badge {
      font-family: var(--primary-font-family, sans-serif);
      font-size: 0.85em;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .cohort-member-int {
      background: rgba(76, 110, 245, 0.15);
      color: var(--secondary-text-color);
    }
    .cohort-member-ext {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    /* Confidence pill color coding (v0.7) */
    .pill.confidence-high {
      background: rgba(76, 175, 80, 0.18);
      color: var(--success-color, #2e7d32);
    }
    .pill.confidence-medium {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    .pill.confidence-low {
      background: rgba(244, 67, 54, 0.15);
      color: var(--error-color, #c62828);
    }
    button.action {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85em;
      color: var(--primary-text-color);
    }
    button.action:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    button.action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* v0.8 phase 5: pulse animation on LLM-busy buttons so the user
       knows the round-trip is in flight (5-15s typical). Replaces the
       static "asking LLM…" text without changing the button copy. */
    @keyframes ha-insights-pulse {
      0%   { opacity: 0.55; }
      50%  { opacity: 1; }
      100% { opacity: 0.55; }
    }
    button.action.busy-pulse:disabled {
      opacity: 1;
      animation: ha-insights-pulse 1.4s ease-in-out infinite;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color);
    }
    button.primary:hover:not(:disabled) {
      background: var(--dark-primary-color, var(--primary-color));
    }

    /* Modal dialog */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .dialog {
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      border-radius: 12px;
      width: 92vw;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    /* v1.10.7: looping-identify modal */
    .identify-dialog { max-width: 520px; }
    .identify-status {
      text-align: center;
      padding: 16px 0;
    }
    .identify-counter {
      font-size: 1.6em;
      font-weight: 600;
      color: var(--primary-text-color);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .identify-method {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
    .identify-error {
      background: rgba(239, 108, 0, 0.1);
      color: var(--warning-color, #ef6c00);
      padding: 8px 10px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 0.85em;
      white-space: pre-wrap;
      text-align: left;
    }
    .identify-hint {
      font-size: 0.9em;
      color: var(--secondary-text-color);
      margin: 8px 0 12px 0;
    }
    .identify-entity-list {
      max-height: 240px;
      overflow-y: auto;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      border-radius: 6px;
      padding: 6px;
    }
    .identify-entity-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.9em;
    }
    .identify-entity-row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    /* v1.10.6: BLE find modal — narrow + tall, centered RSSI readout */
    .ble-find-dialog { max-width: 480px; }
    .ble-rssi-block {
      text-align: center;
      padding: 24px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .ble-rssi-num { font-size: 3em; font-weight: 600; line-height: 1; }
    .ble-rssi-label {
      font-size: 1.1em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 4px;
    }
    .ble-trend {
      margin-top: 12px;
      font-size: 1.4em;
      color: var(--primary-text-color);
    }
    .ble-scanner {
      margin-top: 6px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .ble-hint {
      font-size: 0.9em;
      color: var(--secondary-text-color);
      margin-top: 16px;
    }
    .ble-error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color, #ef4444);
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 0.9em;
    }
    /* Wide variant for the diff modal — YAML needs horizontal room */
    .dialog.dialog-wide {
      max-width: min(1400px, 96vw);
    }
    /* Phone-size — modal eats the screen, and the diff panes stack
       vertically instead of splitting side-by-side */
    @media (max-width: 720px) {
      .dialog-backdrop {
        padding: 0;
      }
      .dialog,
      .dialog.dialog-wide {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
      .diff-grid {
        grid-template-columns: 1fr !important;
      }
      .diff-grid > .diff-pane {
        max-height: 45vh;
      }
      .diff-header {
        grid-template-columns: 1fr !important;
        gap: 4px !important;
      }
    }
    .dialog-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .dialog-title {
      font-size: 1.05em;
      font-weight: 500;
      line-height: 1.4;
    }
    .dialog-close {
      background: none;
      border: none;
      font-size: 1.6em;
      line-height: 1;
      cursor: pointer;
      color: var(--secondary-text-color);
      padding: 0 4px;
      flex-shrink: 0;
    }
    .dialog-close:hover {
      color: var(--primary-text-color);
    }
    .dialog-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .dialog-body h4 {
      margin: 16px 0 8px;
      font-size: 0.9em;
    }
    .dialog-body h4:first-child {
      margin-top: 0;
    }
    .dialog-body pre {
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      overflow-y: auto;
      max-height: 360px;
      font-size: 0.85em;
      line-height: 1.5;
      margin: 0;
      white-space: pre;
    }
    /* v1.2.27 — Suggested-Additions modal */
    .suggest-add-intro {
      font-size: 0.92em;
      color: var(--secondary-text-color);
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .suggest-add-error {
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, white);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      margin-bottom: 12px;
    }
    .suggest-add-empty {
      padding: 24px 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .suggest-add-group {
      margin-bottom: 18px;
    }
    .suggest-add-group-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .suggest-add-group-blurb {
      font-size: 0.82em;
      color: var(--secondary-text-color);
    }
    .suggest-add-tier-chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.74em;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: white;
    }
    .suggest-add-tier-high {
      background: var(--success-color, #2e7d32);
    }
    .suggest-add-tier-medium {
      background: var(--warning-color, #f9a825);
      color: rgba(0, 0, 0, 0.78);
    }
    .suggest-add-tier-low {
      background: var(--secondary-text-color, #777);
    }
    .suggest-add-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 120ms ease;
    }
    .suggest-add-row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .suggest-add-row input[type="checkbox"] {
      margin-top: 3px;
      flex-shrink: 0;
    }
    .suggest-add-row-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .suggest-add-eid {
      font-family: var(--code-font-family, monospace);
      font-size: 0.9em;
      word-break: break-all;
    }
    .suggest-add-reasons {
      font-size: 0.78em;
      color: var(--secondary-text-color);
      line-height: 1.4;
    }
    .suggest-add-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .suggest-add-count {
      font-size: 0.88em;
      color: var(--secondary-text-color);
    }
    .suggest-add-footer-actions {
      display: flex;
      gap: 8px;
    }
    .explanation {
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid var(--primary-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      font-style: italic;
      line-height: 1.5;
    }
    /* v1.12.8 — Specialized card-body renderers (state_shift,
     * physical_device_link, location_proposal). Replaces the
     * generic JSON dump for these v1.7+ insight payloads. */
    .state-shift-summary {
      margin: 12px 0;
      padding: 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
    }
    .state-shift-line {
      display: flex;
      gap: 12px;
      padding: 4px 0;
    }
    .state-shift-label {
      min-width: 140px;
      color: var(--secondary-text-color);
      font-weight: 600;
    }
    .state-shift-value {
      font-family: monospace;
    }
    .device-link-pair {
      margin: 12px 0;
      padding: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .device-link-eid {
      font-family: monospace;
      padding: 4px 8px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 3px;
    }
    .device-link-arrow {
      font-size: 1.4em;
      color: var(--primary-color);
    }
    .location-proposal-summary {
      margin: 12px 0;
      padding: 12px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      border-radius: 4px;
      line-height: 1.5;
    }
    .location-alt-list {
      margin: 8px 0 0;
      padding-left: 20px;
    }
    .location-alt-list li {
      padding: 2px 0;
    }
    .location-proposal-note {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(33, 150, 243, 0.1);
      border-left: 3px solid var(--info-color, #2196f3);
      border-radius: 3px;
      font-size: 0.9em;
    }
    .explain-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    /* v1.5.11 — Setup-guide dialog body for setup_quality insights. */
    .setup-steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    /* v1.2.16 — audit dialog body components */
    .audit-automation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      padding: 10px 12px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 6px;
    }
    .audit-automation-name {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .audit-advice {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--info-color-background, rgba(33, 150, 243, 0.08));
      border-left: 3px solid var(--info-color, #2196f3);
      border-radius: 4px;
      font-size: 0.92em;
      color: var(--primary-text-color);
    }
    .audit-findings {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .audit-finding {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }
    .audit-finding:first-child {
      border-top: none;
    }
    .audit-finding-icon {
      flex: 0 0 auto;
      font-size: 1.1em;
      line-height: 1.3;
    }
    .audit-finding-text {
      flex: 1;
      line-height: 1.35;
    }
    .audit-finding-action {
      flex: 0 0 auto;
      font-size: 0.85em;
      color: var(--primary-color, #4c6ef5);
      text-decoration: none;
      white-space: nowrap;
      align-self: center;
    }
    .audit-finding-action:hover {
      text-decoration: underline;
    }
    .audit-entity-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .audit-entity-grid {
        grid-template-columns: 1fr;
      }
    }
    .audit-entity-label {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      font-weight: 500;
      margin-bottom: 4px;
    }
    .audit-entity-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .audit-entity-pill {
      padding: 3px 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 12px;
      font-size: 0.85em;
      font-family: var(--code-font-family, monospace);
    }
    .audit-entity-pill.is-silent {
      background: rgba(244, 67, 54, 0.08);
      color: var(--error-color, #c62828);
    }
    .audit-entity-pill .silent-dot {
      color: var(--error-color, #c62828);
    }
    .audit-related {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .audit-related-link {
      color: var(--primary-color, #4c6ef5);
      text-decoration: none;
      font-size: 0.92em;
    }
    .audit-related-link:hover {
      text-decoration: underline;
    }
    .audit-raw-payload {
      margin-top: 16px;
    }
    .audit-raw-payload summary {
      cursor: pointer;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .audit-raw-payload pre {
      max-height: 240px;
      overflow: auto;
      font-size: 0.78em;
      background: var(--code-editor-background-color, var(--secondary-background-color, #f5f5f5));
      padding: 8px;
      border-radius: 4px;
      margin-top: 6px;
    }
    .setup-step {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-left: 4px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      padding: 10px 12px;
      background: var(--card-background-color, #fff);
    }
    .setup-step--ok { border-left-color: var(--success-color, #4caf50); }
    .setup-step--warn { border-left-color: var(--warning-color, #ef6c00); }
    .setup-step--todo { border-left-color: var(--error-color, #c62828); }
    .setup-step-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .setup-step-tier {
      font-size: 0.85em;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--secondary-background-color, #f5f5f5);
      color: var(--secondary-text-color, #555);
      white-space: nowrap;
    }
    .setup-step-name {
      font-size: 1em;
      color: var(--primary-text-color);
    }
    .setup-step-advice {
      margin-top: 6px;
      color: var(--secondary-text-color, #555);
      font-size: 0.92em;
      line-height: 1.4;
    }
    .setup-step-scenarios {
      margin-top: 8px;
      font-size: 0.9em;
    }
    .setup-step-scenarios summary {
      cursor: pointer;
      color: var(--primary-color);
      user-select: none;
    }
    .setup-step-scenarios ul {
      margin: 6px 0 0;
      padding-left: 18px;
      color: var(--secondary-text-color, #555);
    }
    .setup-step-scenarios li {
      margin: 2px 0;
    }
    .setup-step-action {
      margin-top: 10px;
    }
    .setup-step-action .action {
      display: inline-block;
      text-decoration: none;
    }
    .setup-step-note {
      margin-top: 8px;
      padding: 6px 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      font-size: 0.88em;
      color: var(--secondary-text-color, #555);
      font-style: italic;
    }
    /* Banner shown when the open setup_quality insight is from an
       older detector version (no setup_steps in the payload) — gives
       the user a real button to re-scan instead of dead text. */
    .setup-stale-banner {
      margin-top: 16px;
      padding: 12px;
      border-radius: 6px;
      background: var(--warning-background-color, rgba(255, 152, 0, 0.08));
      border-left: 3px solid var(--warning-color, #ef6c00);
      font-size: 0.92em;
      color: var(--primary-text-color);
    }
    .setup-stale-banner strong {
      display: block;
      margin-bottom: 4px;
    }
    .setup-stale-action {
      margin-top: 10px;
    }

    .refined-banner {
      padding: 10px 12px;
      background: rgba(76, 175, 80, 0.15);
      border-left: 3px solid var(--success-color, #4caf50);
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 0.9em;
    }
    .refined-banner strong {
      display: block;
      margin-bottom: 4px;
      color: var(--success-color, #2e7d32);
    }
    .diff-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0;
      font-family: var(--code-font-family, monospace);
      font-size: 0.85em;
    }
    .diff-list li {
      padding: 2px 0;
    }
    .diff-add { color: var(--success-color, #2e7d32); }
    .diff-remove { color: var(--error-color, #c62828); }
    .diff-change { color: var(--warning-color, #ef6c00); }

    /* Side-by-side YAML compare for refined preview */
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }
    .compare-col h5 {
      margin: 0 0 6px;
      font-size: 0.8em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .compare-col pre {
      max-height: 300px;
      overflow: auto;
      margin: 0;
      padding: 10px;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 6px;
      font-size: 0.78em;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .compare-col.refined pre {
      border-left: 3px solid var(--success-color, #4caf50);
    }
    @media (max-width: 720px) {
      .compare {
        grid-template-columns: 1fr;
      }
    }

    /* Redaction preview ("What gets sent?") panel */
    .preview {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 3px solid var(--info-color, #2196f3);
      background: rgba(33, 150, 243, 0.08);
      border-radius: 4px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .preview-header strong {
      color: var(--info-color, #1565c0);
    }
    .preview-stats {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
    .preview-stats span {
      margin-right: 12px;
    }
    .preview pre {
      max-height: 240px;
      overflow: auto;
      margin: 0;
      padding: 8px;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 4px;
      font-size: 0.78em;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .preview-pseudonyms {
      margin-top: 8px;
      font-size: 0.78em;
      color: var(--secondary-text-color);
    }
    .preview-pseudonyms code {
      font-family: var(--code-font-family, monospace);
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* Follow-up feedback for re-refine */
    .feedback {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.2));
      border-radius: 6px;
    }
    .feedback h5 {
      margin: 0 0 6px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .feedback textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 56px;
      padding: 6px 8px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 4px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      resize: vertical;
    }
    .feedback textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Inline payload editor (v0.8 phase 3) */
    .payload-edit {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 6px;
    }
    .payload-edit button {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      color: var(--primary-text-color);
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8em;
    }
    .payload-edit button:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    textarea.payload-editor {
      width: 100%;
      box-sizing: border-box;
      min-height: 240px;
      max-height: 360px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font-family: var(--code-font-family, "SFMono-Regular", Consolas, monospace);
      font-size: 0.82em;
      line-height: 1.5;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color);
      resize: vertical;
      white-space: pre;
    }
    textarea.payload-editor:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    textarea.payload-editor.error {
      border-color: var(--error-color, #c62828);
    }
    .payload-error {
      margin-top: 6px;
      padding: 8px 10px;
      background: rgba(244, 67, 54, 0.10);
      color: var(--error-color, #c62828);
      border-radius: 4px;
      font-size: 0.85em;
    }

    /* Rename inputs */
    .rename {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 6px;
    }
    .rename h4 {
      margin: 0 0 8px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .rename label {
      display: block;
      font-size: 0.78em;
      color: var(--secondary-text-color);
      margin: 6px 0 2px;
    }
    .rename input,
    .rename textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 4px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .rename textarea {
      resize: vertical;
      min-height: 48px;
    }
    .rename input:focus,
    .rename textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Test-actions result panel */
    .test-results {
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-left: 3px solid var(--primary-color);
    }
    .test-results.ok {
      border-left-color: var(--success-color, #4caf50);
      background: rgba(76, 175, 80, 0.10);
    }
    .test-results.fail {
      border-left-color: var(--error-color, #f44336);
      background: rgba(244, 67, 54, 0.08);
    }
    .test-results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .test-results-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1em;
      color: var(--secondary-text-color);
      line-height: 1;
      padding: 0 4px;
    }
    .test-results ul {
      list-style: none;
      padding: 0;
      margin: 6px 0 0;
      font-size: 0.88em;
    }
    .test-results li {
      padding: 4px 0;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .test-results .icon {
      flex-shrink: 0;
      width: 1.1em;
      text-align: center;
    }
    .test-results .icon-ok { color: var(--success-color, #2e7d32); }
    .test-results .icon-fail { color: var(--error-color, #c62828); }
    .test-results .icon-skip { color: var(--secondary-text-color); }
    .test-results .meta {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .test-results-error {
      color: var(--error-color, #c62828);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  `;

  setConfig(config: CardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  /** Declarative-binding alias for setConfig — lets parents do
   *  `<ha-insights-card .config=${cfg}>` and have Lit reuse the same
   *  element across renders so the card preserves its state (open
   *  modal, in-flight refine, etc). The panel relies on this. */
  public set config(value: CardConfig | undefined) {
    if (value) this.setConfig(value);
  }
  public get config(): CardConfig {
    return this._config;
  }

  getCardSize(): number {
    return Math.min(this._insights.length, this._config.max_rows ?? DEFAULT_MAX_ROWS) + 2;
  }

  /** Lovelace hook — return a visual editor for Edit Card UI. */
  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement("ha-insights-card-editor");
  }

  /** Lovelace hook — sensible defaults when the user adds a fresh card. */
  public static getStubConfig(): Partial<CardConfig> {
    return {
      title: "HA Insights",
      min_confidence: 0.5,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._keydownHandler);
    // Panel dispatches these around its Scan / Purge / Backfill flows
    // so we can show a clean loading state instead of the noisy
    // subscribe-stream rows piling up live + getting re-deduped at the end.
    window.addEventListener(
      "ha-insights-scan-start",
      this._scanStarted as EventListener,
    );
    window.addEventListener(
      "ha-insights-refresh",
      this._refreshFromEvent as EventListener,
    );
    // v1.2.22: hard-clear on purge (panel dispatches this event after
    // calling ha_insights.purge_observations). Belt-and-braces with
    // the subscribe-stream "purged" handling — works even if the
    // subscribe stream is briefly desynced.
    window.addEventListener(
      "ha-insights-purged",
      this._handlePurgedEvent as EventListener,
    );
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._updateAutoMaxRows(entry.contentRect.height);
      }
    });
    this._resizeObserver.observe(this);
    // v1.2.13: re-wire on re-mount.
    //
    // Background: v1.2.9 made render `_hello`-gated and removed the
    // `_loading` flag — "data-driven render". `disconnectedCallback`
    // clears `_hello` so a fresh fetch fires on re-mount. The
    // `_wire()` trigger lives in `updated()` keyed on
    // `changedProps.has("hass")`.
    //
    // That works when HA's panel framework drops the element and
    // mounts a fresh one (Lit sets `hass` from scratch → "change").
    // BUT when the framework keeps the SAME element instance and
    // just toggles its connected state (e.g. tab switch / "back from
    // another app"), `hass` keeps its old reference and `updated()`
    // doesn't see a hass-change → `_wire()` never fires → card
    // renders the empty `!_hello` placeholder forever.
    //
    // The defensive recovery: if we have `hass` already AND no
    // `_hello`, fire `_wire()` now. Idempotent — `_wire()` short-
    // circuits if it's already running, and a successful run sets
    // `_hello` so the next reconnect cycle skips the work.
    if (this.hass && !this._hello) {
      void this._wire();
    }
  }

  private _scanStarted = (): void => {
    this._scanInProgress = true;
  };

  /** v1.2.22 — hard-clear insights on panel-driven purge AND set a
   *  short suppression window so post-purge "added" subscribe events
   *  (from a scan that runs before the user has time to look) are
   *  ignored. Without this, users click Purge and immediately watch
   *  insights re-flood from the next periodic scan — looks like the
   *  button doesn't work. */
  private _handlePurgedEvent = (e: Event): void => {
    const detail = (e as CustomEvent<{ suppressionMs?: number }>).detail;
    const ms = typeof detail?.suppressionMs === "number" ? detail.suppressionMs : 30_000;
    this._insights = [];
    this._suppressAddedUntil = Date.now() + ms;
    if (this._dialogId) this._closeDialog();
  };

  /** v1.2.8 — timeout-wrap a WS promise so an unrecoverably-hanging
   *  call (post-tab-pause, connection in limbo) can't block the UI
   *  forever. Rejects with a typed error after `timeoutMs` so callers
   *  can show the user a real failure instead of "Loading…" forever.
   *  8s default — generous for a healthy WS, tight enough that users
   *  notice failures within their attention span. */
  private static readonly _WS_TIMEOUT_MS = 8_000;
  private _withTimeout<T>(
    promise: Promise<T>,
    label: string,
    timeoutMs: number = HaInsightsCard._WS_TIMEOUT_MS,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        window.setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  private _refreshFromEvent = async (): Promise<void> => {
    // v1.2.9: no more _loading flag to manage. Render is data-driven
    // (insights / _hello / _error); this method just updates the
    // underlying data, render handles the rest. `_scanInProgress`
    // stays because it's a legitimate transient indicator a scan is
    // running RIGHT NOW (user clicked Run scan, results coming).
    if (!this.hass) {
      this._scanInProgress = false;
      return;
    }
    // Refresh hello in parallel so the footer + protocol-skew banner
    // reflect the latest deploy. Non-fatal — list-refresh is the
    // user-visible bit.
    try {
      this._hello = await this._withTimeout(
        this.hass.connection.sendMessagePromise<HelloResult>({
          type: "home_insights/hello",
          card_version: "0.8.2",
        }),
        "home_insights/hello",
      );
    } catch (err) {
      console.debug("ha-insights-card hello refresh failed", err);
    }
    // List is the load-bearing call. If it fails AND we have no
    // existing insights to fall back to, surface the error so the
    // user knows the card is alive and explains itself. If we DO
    // have prior insights, keep them visible — stale is better than
    // blank.
    try {
      const result = await this._withTimeout(
        this.hass.connection.sendMessagePromise<{ insights: Insight[] }>({
          type: "home_insights/list",
          include_applied: Boolean(this._config.include_applied),
          include_retired: this._showHistory,
          include_dismissed: this._showHistory,
          include_snoozed: this._showHistory,
        }),
        "home_insights/list",
      );
      this._insights = result.insights ?? [];
      this._error = undefined;
    } catch (err) {
      console.warn("ha-insights-card refresh-from-event failed", err);
      if (this._insights.length === 0) {
        this._error = `Could not refresh insights: ${this._asMessage(err)}`;
      }
    } finally {
      this._scanInProgress = false;
    }
  };

  /** Approximate per-row height — title + meta + padding + border. */
  private static readonly ROW_HEIGHT_PX = 72;
  /** Header consumes a fixed slice; banners/toast eat into the body too. */
  private static readonly HEADER_HEIGHT_PX = 60;

  private _updateAutoMaxRows(hostHeight: number): void {
    const available = Math.max(0, hostHeight - HaInsightsCard.HEADER_HEIGHT_PX);
    const rows = Math.max(1, Math.floor(available / HaInsightsCard.ROW_HEIGHT_PX));
    if (rows !== this._autoMaxRows) {
      this._autoMaxRows = rows;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    // v1.2.9: trigger initial fetch when hass first arrives. The
    // gate is `!this._hello` — if hello is undefined we haven't
    // successfully talked to the integration yet. Single source of
    // truth: hello-response IS the "we're connected" signal.
    if (changedProps.has("hass") && this.hass && !this._hello) {
      void this._wire();
    }
    if (changedProps.has("_toast") && this._toast) {
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this._toast = undefined;
      }, 2500);
    }
    if (changedProps.has("_dialogId")) {
      // Lock body scroll while modal is open so the dashboard underneath
      // doesn't move when users scroll the dialog body.
      document.body.style.overflow = this._dialogId ? "hidden" : "";
    }
    if (changedProps.has("_insights")) {
      // v1.1: emit an event the panel listens for so it can refresh its
      // chip-filter options + "Showing X of Y" counters. Bubbles +
      // composed so the panel parent receives it through the shadow DOM.
      this.dispatchEvent(
        new CustomEvent("insights-loaded", {
          detail: { insights: this._insights },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._keydownHandler);
    window.removeEventListener(
      "ha-insights-scan-start",
      this._scanStarted as EventListener,
    );
    window.removeEventListener(
      "ha-insights-refresh",
      this._refreshFromEvent as EventListener,
    );
    window.removeEventListener(
      "ha-insights-purged",
      this._handlePurgedEvent as EventListener,
    );
    // v1.2.9: resume-listener cleanup removed alongside the
    // visibility handler. Nothing to tear down besides the standard
    // subscribe handle + resize observer.
    document.body.style.overflow = "";
    this._unsub?.();
    this._unsub = undefined;
    // Clear `_hello` so a fresh element instance after a re-mount
    // (HA panel navigation cycle) treats itself as un-fetched and
    // re-runs the initial fetch via updated().
    this._hello = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  private async _wire(): Promise<void> {
    if (!this.hass) return;
    if (this._wiring) return; // v1.2.13: re-entry guard
    this._wiring = true;
    // v1.2.8: every WS call gets a timeout. If the call hangs (post-
    // tab-resume, WS-reconnect-in-flight, slow integration startup),
    // we surface a real error after 8s instead of sitting on
    // "Loading…" forever.
    // v1.2.9: no _loading flag to clear. Failures set _error which
    // render() shows as a banner; subsequent retries clear _error
    // on success. The card always renders SOMETHING useful — never
    // a stuck curtain.
    try {
      try {
        this._hello = await this._withTimeout(
          this.hass.connection.sendMessagePromise<HelloResult>({
            type: "home_insights/hello",
            card_version: "0.8.2",
          }),
          "home_insights/hello",
        );
      } catch (err) {
        this._error = `Integration not reachable: ${this._asMessage(err)}`;
        return;
      }

      try {
        const result = await this._withTimeout(
          this.hass.connection.sendMessagePromise<{ insights: Insight[] }>({
            type: "home_insights/list",
            include_applied: Boolean(this._config.include_applied),
            include_retired: this._showHistory,
            include_dismissed: this._showHistory,
            include_snoozed: this._showHistory,
          }),
          "home_insights/list",
        );
        this._insights = result.insights ?? [];
        this._error = undefined; // success clears any prior error
      } catch (err) {
        this._error = `Could not list insights: ${this._asMessage(err)}`;
        return;
      }

      // Drop any stale subscription from a prior wire cycle (e.g.
      // tab-return re-mount where disconnectedCallback fired the old
      // unsub but the new connect needs a fresh subscribe).
      this._unsub?.();
      this._unsub = undefined;
      try {
        this._unsub = await this._withTimeout(
          this.hass.connection.subscribeMessage<SubscribeEvent>(
            (event) => this._handleEvent(event),
            { type: "home_insights/subscribe" },
          ),
          "home_insights/subscribe",
        );
      } catch (err) {
        console.warn("ha-insights-card subscribe failed", err);
        // Subscribe is non-fatal — we have list data; the user just
        // won't see live updates until next refresh.
      }
    } finally {
      this._wiring = false;
    }
  }

  private _handleEvent(event: SubscribeEvent): void {
    // `purged` events carry no insight payload — server fires one when
    // the user clicks "Purge all" / calls ha_insights.purge_observations.
    // Drop the entire local list so the panel goes empty live, no
    // manual page refresh needed.
    if (event.action === "purged") {
      this._insights = [];
      if (this._dialogId) this._closeDialog();
      return;
    }
    if (!event.insight) return;
    // v1.2.22: drop "added" events during the post-purge suppression
    // window. Scans keep running in the background; the user gets a
    // brief moment of empty state before detection resumes. Other
    // event actions (dismissed/snoozed/applied/undone) bypass —
    // they're user-initiated and shouldn't be suppressed.
    if (event.action === "added" && Date.now() < this._suppressAddedUntil) {
      return;
    }
    const next = [...this._insights];
    const idx = next.findIndex((i) => i.id === event.insight!.id);
    const wantApplied = Boolean(this._config.include_applied);
    if (event.action === "added") {
      if (idx >= 0) next[idx] = event.insight;
      else next.unshift(event.insight);
    } else if (
      event.action === "dismissed" ||
      event.action === "snoozed"
    ) {
      if (idx >= 0) next.splice(idx, 1);
      if (this._dialogId === event.insight.id) this._closeDialog();
    } else if (event.action === "applied") {
      // If this card includes_applied, keep the row + update with the
      // new applied state; otherwise drop it from the active list.
      if (wantApplied) {
        if (idx >= 0) next[idx] = event.insight;
        else next.unshift(event.insight);
      } else if (idx >= 0) {
        next.splice(idx, 1);
        if (this._dialogId === event.insight.id) this._closeDialog();
      }
    } else if (event.action === "undone") {
      // Insight is back to active state — keep visible regardless
      if (idx >= 0) next[idx] = event.insight;
      else next.unshift(event.insight);
    } else if (idx >= 0) {
      next[idx] = event.insight;
    }
    this._insights = next;
  }

  /** Optimistic remove — keeps the UX snappy if the subscribe event lags. */
  private _removeFromList(id: string): void {
    this._insights = this._insights.filter((i) => i.id !== id);
    if (this._dialogId === id) this._closeDialog();
  }

  private async _runScanNow(): Promise<void> {
    if (!this.hass || this._scanBusy) return;
    // home_insights/scan_now WS endpoint awaits actual scan completion
    // and returns counts. call_service was returning the moment the call
    // queued, so the toast said "complete" instantly while the scan was
    // still in flight, with no in-progress feedback.
    this._scanBusy = true;
    this._toast = "Scanning…";
    try {
      const scan = await this.hass.connection.sendMessagePromise<{
        detectors_run: string[];
        insights_emitted: number;
      }>({ type: "home_insights/scan_now" });
      const noun = scan.insights_emitted === 1 ? "insight" : "insights";
      this._toast =
        `Scan complete: ${scan.insights_emitted} new ${noun} from ${scan.detectors_run.length} detectors`;
      // Refresh the list so any new insights show up immediately
      try {
        const result = await this.hass.connection.sendMessagePromise<{
          insights: Insight[];
        }>({
          type: "home_insights/list",
          include_applied: Boolean(this._config.include_applied),
          include_retired: this._showHistory,
          include_dismissed: this._showHistory,
          include_snoozed: this._showHistory,
        });
        this._insights = result.insights ?? [];
      } catch {
        // Subscribe events will eventually catch up; non-fatal
      }
    } catch (err) {
      this._error = `Scan failed: ${this._asMessage(err)}`;
    } finally {
      this._scanBusy = false;
    }
  }

  private async _undo(insight: Insight, force = false): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        automation_id: string;
        drift_detected: boolean;
        force_used: boolean;
      }>({
        type: "home_insights/undo",
        insight_id: insight.id,
        force,
      });
      this._toast = result.drift_detected && result.force_used
        ? `Undid ${insight.title} (forced — your edits were lost)`
        : `Undid ${insight.title}`;
    } catch (err) {
      const message = this._asMessage(err);
      // Drift error is recoverable — offer force-undo confirmation
      const code = (err as { code?: string }).code;
      if (code === "drift") {
        const proceed = window.confirm(
          `${message}\n\nForce undo and lose your manual edits?`,
        );
        if (proceed) {
          await this._undo(insight, true);
          return;
        }
      } else {
        this._failModal(`Undo failed: ${message}`);
      }
    } finally {
      this._busyId = undefined;
    }
  }

  private async _apply(insight: Insight, refinedPayload?: Record<string, unknown>): Promise<void> {
    if (!this.hass) return;

    // If the user opened the inline payload editor, parse their JSON.
    // Parse errors abort the apply with an inline error in the modal —
    // the modal stays open so they can fix and retry.
    let editedPayload: Record<string, unknown> | undefined;
    const editedSource = this._payloadEditsById.get(insight.id);
    if (
      editedSource !== undefined
      && this._editingPayloadFor.has(insight.id)
    ) {
      try {
        const parsed = JSON.parse(editedSource);
        if (
          typeof parsed !== "object"
          || parsed === null
          || Array.isArray(parsed)
        ) {
          throw new Error("Edited payload must be a JSON object");
        }
        editedPayload = parsed as Record<string, unknown>;
        const errs = new Map(this._payloadParseErrorById);
        errs.delete(insight.id);
        this._payloadParseErrorById = errs;
      } catch (err) {
        const errs = new Map(this._payloadParseErrorById);
        errs.set(insight.id, `Invalid JSON: ${this._asMessage(err)}`);
        this._payloadParseErrorById = errs;
        return;
      }
    }

    this._busyId = insight.id;
    try {
      // Edit precedence: explicit edited payload > refined > original.
      // Rename block layers on top of whichever base the user is using.
      const basePayload = editedPayload ?? refinedPayload ?? insight.payload;
      const edits = this._renameEdits.get(insight.id);
      const renamed = edits && (edits.alias !== undefined || edits.description !== undefined);
      const useOverride = editedPayload || refinedPayload || renamed;
      const override: Record<string, unknown> | undefined =
        useOverride
          ? { ...basePayload, ...(edits ?? {}) }
          : undefined;

      const message: { type: string; insight_id: string; payload_override?: Record<string, unknown> } = {
        type: "home_insights/apply",
        insight_id: insight.id,
      };
      if (override) message.payload_override = override;
      await this.hass.connection.sendMessagePromise(message);

      // Cleanup local state
      this._refinedById.delete(insight.id);
      this._renameEdits.delete(insight.id);
      this._resetRefineConversation(insight.id);
      this._removeFromList(insight.id);

      const label = editedPayload
        ? "Applied (edited)"
        : refinedPayload
          ? "Applied refined"
          : renamed
            ? "Applied (renamed)"
            : "Applied";
      this._toast = `${label}: ${insight.title}`;

      // Cleanup edit state on successful apply
      const editing = new Set(this._editingPayloadFor);
      editing.delete(insight.id);
      this._editingPayloadFor = editing;
      const drafts = new Map(this._payloadEditsById);
      drafts.delete(insight.id);
      this._payloadEditsById = drafts;
    } catch (err) {
      this._failModal(`Apply failed: ${this._asMessage(err)}`);
    } finally {
      this._busyId = undefined;
    }
  }

  private _togglePayloadEdit(
    insight: Insight,
    basePayload?: Record<string, unknown>,
  ): void {
    const editing = new Set(this._editingPayloadFor);
    if (editing.has(insight.id)) {
      editing.delete(insight.id);
      // Discard the in-progress edit
      const drafts = new Map(this._payloadEditsById);
      drafts.delete(insight.id);
      this._payloadEditsById = drafts;
      const errs = new Map(this._payloadParseErrorById);
      errs.delete(insight.id);
      this._payloadParseErrorById = errs;
    } else {
      editing.add(insight.id);
      // Seed from the base payload the user is currently looking at:
      // refined when in refined-preview view, else the original.
      const seed = basePayload ?? insight.payload;
      const drafts = new Map(this._payloadEditsById);
      drafts.set(insight.id, JSON.stringify(seed, null, 2));
      this._payloadEditsById = drafts;
    }
    this._editingPayloadFor = editing;
  }

  private _onPayloadEditInput(insightId: string, e: Event): void {
    const value = (e.target as HTMLTextAreaElement).value;
    const drafts = new Map(this._payloadEditsById);
    drafts.set(insightId, value);
    this._payloadEditsById = drafts;
    // Clear stale parse error so user gets immediate feedback on next Apply
    if (this._payloadParseErrorById.has(insightId)) {
      const errs = new Map(this._payloadParseErrorById);
      errs.delete(insightId);
      this._payloadParseErrorById = errs;
    }
  }

  private _onRenameField(
    insightId: string,
    field: "alias" | "description",
    e: Event,
  ): void {
    const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
    const next = new Map(this._renameEdits);
    const entry = { ...(next.get(insightId) ?? {}) };
    entry[field] = value;
    next.set(insightId, entry);
    this._renameEdits = next;
  }

  private _renderRename(insight: Insight, refined: RefinedState | undefined): TemplateResult {
    const base = refined?.payload ?? insight.payload;
    const edits = this._renameEdits.get(insight.id) ?? {};
    const alias = edits.alias ?? (base.alias as string | undefined) ?? "";
    const description = edits.description ?? (base.description as string | undefined) ?? "";
    return html`
      <div class="rename">
        <h4>Customize</h4>
        <label for="ha-insights-alias-${insight.id}">Alias</label>
        <input
          id="ha-insights-alias-${insight.id}"
          type="text"
          .value=${alias}
          @input=${(e: Event) => this._onRenameField(insight.id, "alias", e)}
        />
        <label for="ha-insights-desc-${insight.id}">Description</label>
        <textarea
          id="ha-insights-desc-${insight.id}"
          .value=${description}
          @input=${(e: Event) => this._onRenameField(insight.id, "description", e)}
        ></textarea>
      </div>
    `;
  }

  /** Pick the right error sink. Modal-open errors stay scoped; the rest go
   *  to the main card banner. */
  private _failModal(message: string): void {
    if (this._dialogId) {
      this._modalError = message;
    } else {
      this._error = message;
    }
  }

  private async _dismiss(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/dismiss",
        insight_id: insight.id,
      });
      this._removeFromList(insight.id);
      this._toast = "Dismissed";
    } catch (err) {
      this._failModal(`Dismiss failed: ${this._asMessage(err)}`);
    } finally {
      this._busyId = undefined;
    }
  }

  private async _snooze(insight: Insight): Promise<void> {
    if (!this.hass) return;
    const until = new Date();
    until.setDate(until.getDate() + 7);
    this._busyId = insight.id;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/snooze",
        insight_id: insight.id,
        until: until.toISOString(),
      });
      this._removeFromList(insight.id);
      this._toast = "Snoozed for 7 days";
    } catch (err) {
      this._failModal(`Snooze failed: ${this._asMessage(err)}`);
    } finally {
      this._busyId = undefined;
    }
  }

  /** v1.2.28: Retire an insight — the third lifecycle option alongside
   *  Dismiss / Snooze. Different semantics: Retire means "I've decided
   *  NOT to automate this pattern" and survives re-detections of the
   *  same fingerprint until the user explicitly un-retires through the
   *  history view. Stays out of the default list. */
  private async _retire(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/retire",
        insight_id: insight.id,
      });
      if (!this._showHistory) {
        this._removeFromList(insight.id);
      }
      this._toast = "Retired — won't suggest again";
    } catch (err) {
      this._failModal(`Retire failed: ${this._asMessage(err)}`);
    } finally {
      this._busyId = undefined;
    }
  }

  /** v1.2.28: Reverse a prior Retire decision. Only reachable from the
   *  history view (where retired insights are visible). */
  private async _unretire(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/unretire",
        insight_id: insight.id,
      });
      this._toast = "Un-retired — back in the suggestion queue";
      // Force a refresh so the row re-emerges in the default list
      // (history toggle stays where it was).
      window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
    } catch (err) {
      this._failModal(`Un-retire failed: ${this._asMessage(err)}`);
    } finally {
      this._busyId = undefined;
    }
  }

  /** v1.2.28: Toggle the history view. Re-fetches the list with the
   *  retired/dismissed/snoozed surfaces opted in (or out). */
  private async _toggleHistory(): Promise<void> {
    this._showHistory = !this._showHistory;
    if (!this.hass) return;
    try {
      const result = await this._withTimeout(
        this.hass.connection.sendMessagePromise<{ insights: Insight[] }>({
          type: "home_insights/list",
          include_applied: Boolean(this._config.include_applied),
          include_retired: this._showHistory,
          include_dismissed: this._showHistory,
          include_snoozed: this._showHistory,
        }),
        "home_insights/list (history)",
      );
      this._insights = result.insights ?? [];
    } catch (err) {
      this._failModal(
        `Couldn't load history: ${this._asMessage(err)}`,
      );
    }
  }

  /** Preview the deterministic-fix audit (Phase B.5) as a side-by-
   *  side diff. NO LLM call — the refined YAML is already in the
   *  insight payload from when the detector ran. We just need to
   *  pull the current YAML so the diff has both sides.
   *
   *  Cost: one cheap WS call to home_insights/get_automation,
   *  zero LLM tokens. Lets users see "here's what would change if
   *  I click Apply" without committing. */
  private async _previewDeterministicAudit(insight: Insight): Promise<void> {
    if (!this.hass) return;
    const payload = (insight.payload as Record<string, unknown>) || {};
    const auditMeta =
      (payload._audit as Record<string, unknown> | undefined) || {};
    const automationId =
      (auditMeta.automation_id as string) ||
      (payload.id as string) ||
      "";
    const alias =
      (auditMeta.automation_alias as string) ||
      (payload.alias as string) ||
      automationId;
    const fixSummaries = Array.isArray(auditMeta.fix_summaries)
      ? (auditMeta.fix_summaries as string[])
      : [];
    // The refined automation lives at the top level of the payload
    // (Phase B.5 spreads it). Strip the `_audit` metadata so we
    // diff just the YAML the user would actually apply.
    const refinedConfig: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k === "_audit") continue;
      refinedConfig[k] = v;
    }
    // Prefer the backend's pre-serialized YAML (now stored on the
    // insight payload as _audit.refined_yaml_text). Falls back to a
    // client-side JSON dump for backwards compatibility with older
    // stored audit insights.
    const backendRefinedYaml =
      typeof auditMeta.refined_yaml_text === "string"
        ? (auditMeta.refined_yaml_text as string)
        : "";
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        yaml: string;
        config: Record<string, unknown>;
      }>({
        type: "home_insights/get_automation",
        automation_id: automationId,
      });
      const refinedYaml =
        backendRefinedYaml || JSON.stringify(refinedConfig, null, 2);
      this._refineAutomationModal = {
        automationId,
        alias,
        originalYaml: result.yaml,
        feedback: "",
        busy: false,
        refinedYaml,
        refinedConfig,
        rationale:
          "Deterministic fix — no LLM was called. " +
          (fixSummaries.length > 0
            ? fixSummaries.join(" ")
            : "Review the diff below; Apply writes the refined YAML to your automation."),
        diffSummary: fixSummaries,
        refinedSource: "deterministic",
        auditInsightId: insight.id,
      };
    } catch (err) {
      this._failModal(`Preview failed: ${this._asMessage(err)}`);
    }
  }

  /** Two-stage refinement: take the current modal's refined YAML
   *  (from a 📋 Preview) as the new starting point, then ask the
   *  LLM to refine further with any additional user feedback typed
   *  in the textarea. The deterministic fixes are preserved as the
   *  baseline — the LLM builds on top instead of redoing them. */
  private async _refineFurtherWithLlm(): Promise<void> {
    const m = this._refineAutomationModal;
    if (!this.hass || !m || !m.auditInsightId || !m.refinedConfig) return;
    this._refineAutomationModal = { ...m, busy: true, error: undefined };
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        automation_id: string;
        alias?: string;
        refined_config: Record<string, unknown>;
        original_yaml?: string;
        refined_yaml?: string;
        rationale: string | null;
        diff_summary: string[];
        cached: boolean;
        stage_two?: boolean;
        bytes_sent: number;
        bytes_received: number;
      }>({
        type: "home_insights/audit_suggest",
        insight_id: m.auditInsightId,
        seed_config: m.refinedConfig,
        extra_feedback: m.feedback || "",
        ...(this._config.audit_depth
          ? { analysis_depth: this._config.audit_depth }
          : {}),
      });
      if (!result.refined_yaml) {
        throw new Error(
          "LLM response missing refined_yaml. The integration may "
            + "need a reload to pick up the two-stage refinement code.",
        );
      }
      this._refineAutomationModal = {
        ...m,
        // Baseline is now the algorithm's output (what the LLM was
        // given). Refined is the LLM's further refinement.
        originalYaml: result.original_yaml ?? m.refinedYaml ?? "",
        refinedYaml: result.refined_yaml,
        refinedConfig: result.refined_config,
        rationale: result.rationale,
        diffSummary: result.diff_summary ?? [],
        bytesSent: result.bytes_sent,
        bytesReceived: result.bytes_received,
        busy: false,
        refinedSource: "stage-two",
      };
    } catch (err) {
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        busy: false,
        error: this._asMessage(err),
      };
    }
  }

  /** Ask the LLM for concrete YAML edits on an audit insight whose
   *  findings don't have a deterministic fix. Reuses the
   *  refine-existing-automation modal to render the result. Cached
   *  on the backend by (yaml_hash + observation_kinds_hash) so a
   *  repeated click on the same row costs zero tokens. */
  /** v1.2.27 — Suggested-Additions, deterministic surface.
   *
   *  Fetches candidate entities from the backend (`home_insights/
   *  suggest_additions`) and opens the modal with HIGH/MEDIUM/LOW
   *  tier-grouped checkboxes. HIGH candidates are pre-selected;
   *  MEDIUM/LOW remain unchecked. User picks, clicks Apply → calls
   *  `home_insights/apply` with `additional_entity_ids`.
   *
   *  Local-first feature — no LLM tokens spent regardless of card
   *  configuration. Cross-domain candidates outside the 21 known
   *  turn_on/off domains come back as `unhandled_entity_ids` from
   *  the apply call; we surface a toast with an offer to escalate
   *  to LLM Refine for the right service call.
   */
  private async _openSuggestAddDialog(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._suggestAddBusy = insight.id;
    try {
      const result = await this._withTimeout(
        this.hass.connection.sendMessagePromise<{
          insight_id: string;
          candidates: Array<{
            entity_id: string;
            tier: "HIGH" | "MEDIUM" | "LOW" | string;
            reasons: string[];
            category: string;
          }>;
          required_entity_ids: string[];
          total_count: number;
        }>({
          type: "home_insights/suggest_additions",
          insight_id: insight.id,
        }),
        "home_insights/suggest_additions",
      );

      if (!result.candidates || result.candidates.length === 0) {
        this._toast =
          "No candidate additions found — no nearby entities " +
          "match the criteria for this automation.";
        return;
      }

      // Pre-select HIGH-tier candidates by default (the recommendation).
      // MEDIUM is visible but unchecked; LOW is collapsed under "Show
      // more" in the modal renderer. User overrides freely.
      const preselected = new Set(
        result.candidates
          .filter((c) => c.tier === "HIGH")
          .map((c) => c.entity_id),
      );

      this._suggestAddDialog = {
        insightId: insight.id,
        insightTitle: this._displayTitle(insight),
        candidates: result.candidates,
        requiredEids: result.required_entity_ids ?? [],
        selected: preselected,
        applying: false,
      };
    } catch (err) {
      this._toast = `Couldn't load candidates: ${this._asMessage(err)}`;
    } finally {
      this._suggestAddBusy = null;
    }
  }

  private _toggleSuggestAddSelection(eid: string): void {
    if (!this._suggestAddDialog) return;
    const next = new Set(this._suggestAddDialog.selected);
    if (next.has(eid)) {
      next.delete(eid);
    } else {
      next.add(eid);
    }
    this._suggestAddDialog = {
      ...this._suggestAddDialog,
      selected: next,
    };
  }

  private _closeSuggestAddDialog(): void {
    this._suggestAddDialog = undefined;
  }

  private async _applySuggestedAdditions(): Promise<void> {
    if (!this.hass || !this._suggestAddDialog) return;
    const dialog = this._suggestAddDialog;
    const chosen = Array.from(dialog.selected);
    if (chosen.length === 0) {
      this._suggestAddDialog = {
        ...dialog,
        error: "Select at least one candidate to apply.",
      };
      return;
    }
    this._suggestAddDialog = { ...dialog, applying: true, error: undefined };
    try {
      const result = await this._withTimeout(
        this.hass.connection.sendMessagePromise<{
          automation_id: string;
          refined: boolean;
          unhandled_entity_ids: string[];
        }>({
          type: "home_insights/apply",
          insight_id: dialog.insightId,
          additional_entity_ids: chosen,
        }),
        "home_insights/apply (additions)",
      );

      const applied = chosen.length - (result.unhandled_entity_ids?.length ?? 0);
      const unhandled = result.unhandled_entity_ids ?? [];
      this._closeSuggestAddDialog();
      if (unhandled.length > 0) {
        this._toast =
          `Added ${applied} ${applied === 1 ? "entity" : "entities"}. ` +
          `${unhandled.length} cross-domain ${unhandled.length === 1 ? "candidate" : "candidates"} ` +
          "need LLM Refine to add (different service call). " +
          "Open Refine on the insight to handle them.";
      } else {
        this._toast = `Added ${applied} ${applied === 1 ? "entity" : "entities"} to the automation.`;
      }
      // Force a refresh so the row reflects the applied state.
      window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
    } catch (err) {
      this._suggestAddDialog = {
        ...dialog,
        applying: false,
        error: this._asMessage(err),
      };
    }
  }

  /** v1.2.27 — Render the Suggested-Additions modal. Groups candidates by
   *  tier (HIGH/MEDIUM/LOW) with green/amber/grey chips matching the
   *  confidence-colour convention used elsewhere in the card. Checkboxes
   *  are pre-selected for HIGH-tier rows by `_openSuggestAddDialog`; the
   *  user toggles freely. Apply calls `home_insights/apply` with the
   *  chosen entity_ids tacked onto the existing automation. */
  private _renderSuggestAddDialog(): TemplateResult | typeof nothing {
    const dialog = this._suggestAddDialog;
    if (!dialog) return nothing;

    const grouped: Record<"HIGH" | "MEDIUM" | "LOW", typeof dialog.candidates> = {
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };
    for (const c of dialog.candidates) {
      const tier = (c.tier as "HIGH" | "MEDIUM" | "LOW") in grouped
        ? (c.tier as "HIGH" | "MEDIUM" | "LOW")
        : "LOW";
      grouped[tier].push(c);
    }

    const renderTierGroup = (
      tier: "HIGH" | "MEDIUM" | "LOW",
      label: string,
      blurb: string,
    ): TemplateResult | typeof nothing => {
      const items = grouped[tier];
      if (items.length === 0) return nothing;
      return html`
        <div class="suggest-add-group">
          <div class="suggest-add-group-header">
            <span class="suggest-add-tier-chip suggest-add-tier-${tier.toLowerCase()}">
              ${label}
            </span>
            <span class="suggest-add-group-blurb">${blurb}</span>
          </div>
          ${items.map((c) => {
            const checked = dialog.selected.has(c.entity_id);
            return html`
              <label class="suggest-add-row">
                <input
                  type="checkbox"
                  ?checked=${checked}
                  ?disabled=${dialog.applying}
                  @change=${() => this._toggleSuggestAddSelection(c.entity_id)}
                />
                <div class="suggest-add-row-text">
                  <code class="suggest-add-eid">${c.entity_id}</code>
                  ${c.reasons.length > 0
                    ? html`<div class="suggest-add-reasons">
                        ${c.reasons.join(" · ")}
                      </div>`
                    : nothing}
                </div>
              </label>
            `;
          })}
        </div>
      `;
    };

    const selectedCount = dialog.selected.size;
    const totalCount = dialog.candidates.length;

    return html`
      <div class="dialog-backdrop" @click=${this._closeSuggestAddDialog}>
        <div
          class="dialog"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dialog-header">
            <div class="dialog-title">
              💡 Suggest additions — ${dialog.insightTitle}
            </div>
            <button
              class="dialog-close"
              aria-label="Close"
              ?disabled=${dialog.applying}
              @click=${this._closeSuggestAddDialog}
            >
              ×
            </button>
          </div>
          <div class="dialog-body">
            <div class="suggest-add-intro">
              Pick entities to add to this automation's action block.
              ${dialog.requiredEids.length > 0
                ? html`The existing
                    <strong>${dialog.requiredEids.length}</strong>
                    ${dialog.requiredEids.length === 1
                      ? "entity"
                      : "entities"}
                    in the automation
                    ${dialog.requiredEids.length === 1 ? "is" : "are"}
                    preserved.`
                : nothing}
            </div>
            ${dialog.error
              ? html`<div class="suggest-add-error">${dialog.error}</div>`
              : nothing}
            ${renderTierGroup(
              "HIGH",
              "HIGH",
              "Strong match — pre-selected. Coactivators or same-domain device-mates.",
            )}
            ${renderTierGroup(
              "MEDIUM",
              "MEDIUM",
              "Worth considering — area-mates or cross-domain device-mates.",
            )}
            ${renderTierGroup(
              "LOW",
              "LOW",
              "Weak match — domain-siblings or cross-domain area-mates.",
            )}
            ${totalCount === 0
              ? html`<div class="suggest-add-empty">
                  No candidate additions found.
                </div>`
              : nothing}
          </div>
          <div class="suggest-add-footer">
            <div class="suggest-add-count">
              ${selectedCount} of ${totalCount} selected
            </div>
            <div class="suggest-add-footer-actions">
              <button
                class="action"
                ?disabled=${dialog.applying}
                @click=${this._closeSuggestAddDialog}
              >
                Cancel
              </button>
              <button
                class="action primary ${dialog.applying ? "busy-pulse" : ""}"
                ?disabled=${dialog.applying || selectedCount === 0}
                @click=${this._applySuggestedAdditions}
              >
                ${dialog.applying
                  ? "Applying…"
                  : `Apply ${selectedCount} to automation`}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async _runAuditSuggest(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._auditSuggestBusy = insight.id;
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        automation_id: string;
        alias?: string;
        refined_config: Record<string, unknown>;
        original_yaml?: string;
        refined_yaml?: string;
        rationale: string | null;
        diff_summary: string[];
        cached: boolean;
        bytes_sent: number;
        bytes_received: number;
      }>({
        type: "home_insights/audit_suggest",
        insight_id: insight.id,
        // Per-call override of the integration's audit_analysis_depth
        // OptionsFlow setting. Backend resolves: per-call > options
        // > "concise" default.
        ...(this._config.audit_depth
          ? { analysis_depth: this._config.audit_depth }
          : {}),
      });

      // Loud-fail guard: if the backend didn't ship original_yaml /
      // refined_yaml (only refined_config), the integration is
      // running stale Python and the modal would open blank. Throw
      // here so the user sees the persistent notification + banner,
      // not an empty dialog.
      if (!result.original_yaml || !result.refined_yaml) {
        throw new Error(
          "Audit suggest response is missing YAML fields. The integration "
            + "needs a reload: Settings → Devices & Services → HA Insights → "
            + "⋮ → Reload. Python caches old code until that's done.",
        );
      }
      // Render via the existing refine-existing-automation modal so
      // we don't ship a second YAML diff UI. Backend now serializes
      // both sides as real YAML so the side-by-side diff is readable.
      this._refineAutomationModal = {
        automationId: result.automation_id,
        alias: result.alias ?? "",
        originalYaml: result.original_yaml,
        feedback: "",
        busy: false,
        refinedYaml: result.refined_yaml,
        refinedConfig: result.refined_config,
        rationale: result.rationale,
        diffSummary: result.diff_summary ?? [],
        bytesSent: result.bytes_sent,
        bytesReceived: result.bytes_received,
      };
    } catch (err) {
      const message = this._asMessage(err);
      // Two-channel visibility: card error banner AND an HA persistent
      // notification. A silent button reset is what landed the user
      // here previously — never again. Notification stays until the
      // user dismisses it; banner is per-card-render.
      this._failModal(`Suggest failed: ${message}`);
      void this._postPersistentNotification(
        "HA Insights: 🤖 Suggest failed",
        `Could not suggest improvements for "${insight.title}": ${message}\n\n`
          + "If this is the AttemptAudit/to_dict error, reload the integration "
          + "(Settings → Devices & Services → HA Insights → ⋮ → Reload) — "
          + "Python caches the old code until reload.",
        `ha_insights_suggest_fail_${insight.id}`,
      );
    } finally {
      this._auditSuggestBusy = null;
    }
  }

  /** Fire HA's persistent_notification.create so a failure isn't
   *  hidden in the card's banner if the user scrolled away.
   *  Notification appears under the bell icon in the top bar AND
   *  in Settings → Notifications. */
  private async _postPersistentNotification(
    title: string,
    message: string,
    notificationId: string,
  ): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "persistent_notification",
        service: "create",
        service_data: {
          title,
          message,
          notification_id: notificationId,
        },
      });
    } catch {
      // Notification fallback is best-effort; banner already has it.
    }
  }

  /** v1.10.4: pull the primary entity_id out of an insight's fingerprint.
   *  Mirrors the server-side enrichment in ws_api.ws_list which prefers
   *  `entity_id`, falls back to `follower_entity_id`, then
   *  `leader_entity_id`. Returns null when the insight is a cohort
   *  representative or otherwise doesn't pin a single entity. */
  private _primaryEntityId(insight: Insight): string | null {
    const fp = insight.fingerprint as Record<string, unknown> | undefined;
    if (!fp) return null;
    for (const k of [
      "entity_id",
      "follower_entity_id",
      "leader_entity_id",
      "target_entity_id",
    ]) {
      const v = fp[k];
      if (typeof v === "string" && v.includes(".")) return v;
    }
    return null;
  }

  /** Collect EVERY entity_id referenced by this insight. Includes the
   *  primary entity, any peer/leader/follower from the fingerprint, AND
   *  cohort_members for cohort insights. De-duplicated, sorted for
   *  stable display order. */
  private _allReferencedEntities(insight: Insight): string[] {
    const seen = new Set<string>();
    const fp = insight.fingerprint as Record<string, unknown> | undefined;
    if (fp) {
      for (const k of [
        "entity_id",
        "leader_entity_id",
        "follower_entity_id",
        "target_entity_id",
        "peer_entity_id",
      ]) {
        const v = fp[k];
        if (typeof v === "string" && v.includes(".")) seen.add(v);
      }
    }
    for (const m of insight.cohort_members ?? []) {
      if (typeof m === "string" && m.includes(".")) seen.add(m);
    }
    return Array.from(seen).sort();
  }

  /** v1.10.7: open the looping-identify modal for an insight.
   *
   *  Pre-v1.10.7 we fired the identifier once and showed a toast — but
   *  many devices flash too quickly to spot, the toast disappeared
   *  while users were still searching, and multi-entity insights
   *  (cohorts, lagged-correlation pairs, physical-device-link pairs)
   *  only identified one of the entities.
   *
   *  v1.10.7 flow:
   *    1. Open a modal listing EVERY referenced entity with a checkbox
   *    2. Fire identify on all checked entities immediately
   *    3. Re-fire every 5 seconds (Find My iPhone style)
   *    4. User unchecks entities as they find each physical device
   *    5. Click "Found it!" or "Stop" → tear down + close
   *    6. Counter increments per cycle so user knows it's still running
   */
  private async _identifyEntity(insight: Insight): Promise<void> {
    if (!this.hass) return;
    const entities = this._allReferencedEntities(insight);
    if (entities.length === 0) {
      this._failModal(
        "No identifiable entities in this insight's fingerprint.",
      );
      return;
    }
    this._identifyAllEntities = entities;
    this._identifySelected = new Set(entities);  // all checked by default
    this._identifyEntityId = entities[0];        // legacy single-entity field
    this._identifyMethod = "";
    this._identifyCount = 0;
    this._identifyError = "";
    this._identifyOpen = true;
    // Fire immediately so the user sees instant feedback, then schedule
    // the recurring fire.
    await this._fireIdentifyOnce();
    if (this._identifyTimer != null) clearInterval(this._identifyTimer);
    this._identifyTimer = setInterval(() => {
      void this._fireIdentifyOnce();
    }, 5000);
  }

  /** Fire the identifier ONCE. Used by both the initial click and the
   *  recurring timer. Increments _identifyCount on success, sets
   *  _identifyError on failure (which stops the loop). */
  private async _fireIdentifyOnce(): Promise<void> {
    if (!this.hass || this._identifySelected.size === 0) return;
    // Fire identify on every CHECKED entity in parallel. Errors on
    // individual entities accumulate into _identifyError but don't
    // stop the loop — the other entities may still be identifying
    // successfully.
    const entities = Array.from(this._identifySelected);
    const results = await Promise.allSettled(
      entities.map((entityId) =>
        this.hass!.connection.sendMessagePromise<{
          method?: string;
          message?: string;
        }>({
          type: "home_insights/identify_entity",
          entity_id: entityId,
        }),
      ),
    );
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        if (r.value.method) this._identifyMethod = r.value.method;
      } else {
        errors.push(`${entities[i]}: ${this._asMessage(r.reason)}`);
      }
    }
    this._identifyError = errors.length ? errors.join("\n") : "";
    this._identifyCount = this._identifyCount + 1;
    // If EVERY entity errored, the loop is just generating noise.
    // Stop it so the user can read the failure.
    if (errors.length === results.length && this._identifyTimer != null) {
      clearInterval(this._identifyTimer);
      this._identifyTimer = null;
    }
  }

  /** Toggle whether a specific entity is currently being identified.
   *  Cohort + multi-entity insights surface every referenced entity
   *  as a checkbox in the modal — user can deselect ones they've
   *  already found to narrow down which device is which. */
  private _toggleIdentifyEntity(entityId: string): void {
    const next = new Set(this._identifySelected);
    if (next.has(entityId)) {
      next.delete(entityId);
    } else {
      next.add(entityId);
    }
    this._identifySelected = next;
  }

  /** Close the identify modal and clear the recurring timer. Called by
   *  both "Found it!" and "Stop" — only difference is the toast text. */
  private _stopIdentify(found: boolean): void {
    if (this._identifyTimer != null) {
      clearInterval(this._identifyTimer);
      this._identifyTimer = null;
    }
    const entityCount = this._identifySelected.size;
    this._identifyOpen = false;
    this._identifyEntityId = "";
    this._identifySelected = new Set();
    this._identifyMethod = "";
    this._identifyError = "";
    this._identifyCount = 0;
    if (found && entityCount > 0) {
      this._toast = entityCount === 1
        ? `✅ Found it!`
        : `✅ Identification stopped (${entityCount} entities were active).`;
    }
  }

  /** v1.10.6: open the BLE live-find modal scoped to ONE entity.
   *  Checks BLE capability first; if the entity is trackable, opens
   *  the modal + subscribes to the per-scanner RSSI stream. */
  private async _openBleFindForInsight(insight: Insight): Promise<void> {
    if (!this.hass) return;
    const entityId = this._primaryEntityId(insight);
    if (entityId === null) {
      this._failModal("No entity_id on this insight.");
      return;
    }
    try {
      const cap = await this.hass.connection.sendMessagePromise<{
        capabilities: Record<
          string,
          { is_trackable: boolean; bluetooth_address: string | null;
            reason: string }
        >;
      }>({
        type: "home_insights/ble_capability",
        entity_ids: [entityId],
      });
      const info = cap.capabilities?.[entityId];
      if (!info || !info.is_trackable || !info.bluetooth_address) {
        this._failModal(
          `BLE find not available for ${entityId}: ${info?.reason ?? "no capability info"}`,
        );
        return;
      }
      this._bleFindEntity = entityId;
      this._bleFindAddress = info.bluetooth_address;
      this._bleFindLatest = null;
      this._bleTrendBuffer = [];
      this._bleFindError = "";
      this._bleFindOpen = true;
      void this._subscribeBleFind();
    } catch (err) {
      this._failModal(`BLE capability check failed: ${this._asMessage(err)}`);
    }
  }

  private async _subscribeBleFind(): Promise<void> {
    if (!this.hass) return;
    if (this._bleFindUnsub != null) {
      this._bleFindUnsub();
      this._bleFindUnsub = null;
    }
    try {
      this._bleFindUnsub =
        await this.hass.connection.subscribeMessage<{
          rssi_raw: number;
          rssi_smoothed: number;
          scanner: string;
        }>(
          (event) => {
            this._bleFindLatest = { ...event, received_at: Date.now() };
            const next = [...this._bleTrendBuffer, event.rssi_smoothed];
            if (next.length > 8) next.shift();
            this._bleTrendBuffer = next;
          },
          {
            type: "home_insights/ble_live_find",
            bluetooth_address: this._bleFindAddress,
          },
        );
    } catch (err) {
      this._bleFindError = this._asMessage(err);
    }
  }

  private _closeBleFind(): void {
    if (this._bleFindUnsub != null) {
      this._bleFindUnsub();
      this._bleFindUnsub = null;
    }
    this._bleFindOpen = false;
    this._bleFindLatest = null;
    this._bleTrendBuffer = [];
    this._bleFindError = "";
  }

  private _bleTrend(): { arrow: string; label: string } {
    const buf = this._bleTrendBuffer;
    if (buf.length < 4) return { arrow: "·", label: "settling" };
    const recent = (buf[buf.length - 1] + buf[buf.length - 2]) / 2;
    const earlier = (buf[buf.length - 4] + buf[buf.length - 3]) / 2;
    const delta = recent - earlier;
    if (delta > 2) return { arrow: "↑", label: "getting closer" };
    if (delta < -2) return { arrow: "↓", label: "getting further" };
    return { arrow: "→", label: "stable" };
  }

  private _rssiBucket(rssi: number): { label: string; color: string } {
    if (rssi >= -55) return { label: "HOT", color: "#ef4444" };
    if (rssi >= -70) return { label: "warm", color: "#f97316" };
    if (rssi >= -85) return { label: "cool", color: "#3b82f6" };
    return { label: "cold", color: "#6b7280" };
  }

  /** v1.10.7: render the looping-identify modal. Pre-v1.10.7 a single
   *  call fired with a toast outside the dialog; users couldn't catch
   *  the flash and the toast disappeared. New flow: a focused modal
   *  with a checkbox list of every referenced entity, a fire counter,
   *  and "Found it!" / "Stop" buttons. The recurring timer fires every
   *  5 seconds until the user closes or unchecks all entities. */
  private _renderIdentifyModal(): unknown {
    if (!this._identifyOpen) return nothing;
    const selectedCount = this._identifySelected.size;
    const totalCount = this._identifyAllEntities.length;
    const singleEntity = totalCount === 1;
    return html`
      <div class="dialog-backdrop" @click=${() => this._stopIdentify(false)}>
        <div
          class="dialog identify-dialog"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dialog-header">
            <div class="dialog-title">
              🔆 Identifying ${singleEntity ? this._identifyAllEntities[0] : `${selectedCount} of ${totalCount} entities`}
            </div>
            <button
              class="dialog-close"
              aria-label="Close"
              @click=${() => this._stopIdentify(false)}
            >×</button>
          </div>
          <div class="dialog-body">
            <div class="identify-status">
              <div class="identify-counter">Fired ${this._identifyCount} ${this._identifyCount === 1 ? "time" : "times"}</div>
              ${this._identifyMethod
                ? html`<div class="identify-method">method: ${this._identifyMethod}</div>`
                : ""}
              ${this._identifyError
                ? html`<div class="identify-error">${this._identifyError}</div>`
                : ""}
            </div>
            ${totalCount > 1
              ? html`
                  <div class="identify-hint">
                    Uncheck entities as you find them — the remaining
                    checked ones keep firing every 5s.
                  </div>
                  <div class="identify-entity-list">
                    ${this._identifyAllEntities.map((eid) => html`
                      <label class="identify-entity-row">
                        <input
                          type="checkbox"
                          ?checked=${this._identifySelected.has(eid)}
                          @change=${() => this._toggleIdentifyEntity(eid)}
                        />
                        <span>${eid}</span>
                      </label>
                    `)}
                  </div>
                `
              : html`
                  <div class="identify-hint">
                    The identifier fires every 5 seconds — look or
                    listen for the flash / chime / beep. Click
                    "Found it!" when you've spotted the device.
                  </div>
                `}
          </div>
          <div class="dialog-footer">
            <button
              class="action primary"
              @click=${() => this._stopIdentify(true)}
            >
              ✅ Found it!
            </button>
            <button
              class="action"
              @click=${() => this._stopIdentify(false)}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** v1.10.6: render the BLE find modal — latest RSSI + trend arrow.
   *
   *  The strategy is the same as the bulk-area-assign BLE modal but
   *  scoped to a single entity (passed by the user clicking 📡 in the
   *  insight detail-dialog). Shows:
   *    - Big RSSI number with color bucket (HOT/warm/cool/cold)
   *    - Trend arrow (↑↓→) telling user which direction signal is
   *      moving — wave the phone around to find the device
   *    - Last scanner that saw it (helps in multi-proxy setups)
   *
   *  Subscription auto-tears down on close. EXPERIMENTAL — only works
   *  for entities the BLE-capability endpoint says are trackable. */
  private _renderBleFindModal(): unknown {
    if (!this._bleFindOpen) return nothing;
    const latest = this._bleFindLatest;
    const trend = this._bleTrend();
    const bucket = latest ? this._rssiBucket(latest.rssi_smoothed) : null;
    return html`
      <div class="dialog-backdrop" @click=${this._closeBleFind}>
        <div class="dialog ble-find-dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <div class="dialog-title">📡 BLE find — ${this._bleFindEntity}</div>
            <button class="dialog-close" aria-label="Close" @click=${this._closeBleFind}>×</button>
          </div>
          <div class="dialog-body">
            ${this._bleFindError
              ? html`<div class="ble-error">${this._bleFindError}</div>`
              : ""}
            ${latest && bucket
              ? html`
                  <div class="ble-rssi-block" style="color: ${bucket.color};">
                    <div class="ble-rssi-num">${latest.rssi_smoothed.toFixed(0)} dBm</div>
                    <div class="ble-rssi-label">${bucket.label}</div>
                    <div class="ble-trend">${trend.arrow} ${trend.label}</div>
                    <div class="ble-scanner">last seen by: ${latest.scanner}</div>
                  </div>
                `
              : html`<div class="ble-rssi-block" style="color: var(--secondary-text-color);">
                  <div class="ble-rssi-num">— dBm</div>
                  <div class="ble-rssi-label">waiting…</div>
                </div>`}
            <p class="ble-hint">
              Wave your phone around. The arrow tells you whether you're
              getting closer (↑) or further (↓) from the device. This
              works best with a Bluetooth proxy in each major area, or
              the HA Companion app's BLE scanner running on your phone.
            </p>
          </div>
          <div class="dialog-footer">
            <button class="action" @click=${this._closeBleFind}>Stop &amp; close</button>
          </div>
        </div>
      </div>
    `;
  }

  private async _explain(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._explainBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<ExplainResult>({
        type: "home_insights/explain",
        insight_id: insight.id,
      });
      this._insights = this._insights.map((i) =>
        i.id === insight.id ? { ...i, explanation: result.explanation } : i,
      );
    } catch (err) {
      this._failModal(`Explain failed: ${this._asMessage(err)}`);
    } finally {
      this._explainBusy = false;
    }
  }

  /** v0.9 phase 6: ask the LLM for plausible causes of an anomaly. */
  private async _hypothesize(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._hypothesizeBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        hypothesis: string;
      }>({
        type: "home_insights/hypothesize",
        insight_id: insight.id,
      });
      const next = new Map(this._hypothesisById);
      next.set(insight.id, result.hypothesis ?? "");
      this._hypothesisById = next;
    } catch (err) {
      this._failModal(`Hypothesize failed: ${this._asMessage(err)}`);
    } finally {
      this._hypothesizeBusy = false;
    }
  }

  private async _refine(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._refineBusy = true;
    this._modalError = undefined;
    try {
      // v1.0 RC #1: pre-flight cost estimate. The server runs the same
      // redactor + prompt build as the actual Refine but stops before
      // the LLM call, so we get an accurate token + USD figure for free.
      // If it crosses the configured threshold, ask the user to confirm
      // before burning tokens. Failures fall through silently — we'd
      // rather Refine than block on a flaky pre-flight.
      const feedback = (this._feedbackById.get(insight.id) ?? "").trim();
      try {
        const estimate = await this.hass.connection.sendMessagePromise<{
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          cost_source: string;
          threshold_usd: number;
          requires_confirm: boolean;
          agent_id: string | null;
        }>({
          type: "home_insights/refine_cost_estimate",
          insight_id: insight.id,
          ...(feedback ? { feedback } : {}),
        });
        if (estimate.requires_confirm) {
          const tokens = estimate.tokens_in + estimate.tokens_out;
          const dollars = estimate.cost_usd.toFixed(4);
          const agent = estimate.agent_id ?? "default agent";
          const ok = window.confirm(
            `Refine on ${agent} will use ~${tokens} tokens (~$${dollars}). ` +
              `That's above the configured $${estimate.threshold_usd.toFixed(2)} ` +
              `threshold. Continue?`,
          );
          if (!ok) {
            this._toast = "Refine canceled";
            return;
          }
        }
      } catch {
        // Pre-flight failed — proceed with the actual refine; the user
        // sees the regular refine error path if it really is broken.
      }

      const message: {
        type: string;
        insight_id: string;
        feedback?: string;
        conversation_id?: string;
      } = {
        type: "home_insights/refine",
        insight_id: insight.id,
      };
      if (feedback) message.feedback = feedback;
      // Thread the prior conversation_id (if any) so the agent retains
      // context across turns. Server failover automatically drops it
      // when falling over to a different agent.
      const prior = this._refineConversationById.get(insight.id);
      if (prior) message.conversation_id = prior;
      const result =
        await this.hass.connection.sendMessagePromise<RefineResult>(message);
      // Capture the new (or echoed) conversation_id for the next turn.
      if (result.conversation_id) {
        const nextConv = new Map(this._refineConversationById);
        nextConv.set(insight.id, result.conversation_id);
        this._refineConversationById = nextConv;
      }
      const nextTurns = new Map(this._refineTurnsById);
      nextTurns.set(insight.id, (nextTurns.get(insight.id) ?? 0) + 1);
      this._refineTurnsById = nextTurns;
      const next = new Map(this._refinedById);
      next.set(insight.id, {
        payload: result.refined_payload,
        rationale: result.rationale,
        diffSummary: result.diff_summary,
      });
      this._refinedById = next;
      // Clear the feedback once the LLM has consumed it; the user can type
      // fresh notes for the next refine pass.
      const nextFb = new Map(this._feedbackById);
      nextFb.delete(insight.id);
      this._feedbackById = nextFb;
      this._toast = result.diff_summary.length > 0
        ? `Refined: ${result.diff_summary.length} change(s) proposed`
        : "Refined: no changes proposed";
    } catch (err) {
      const message = this._asMessage(err);
      // If validation rejected the refinement because the LLM added an
      // entity not in the original, auto-populate the feedback box with a
      // constraint hint so the user can click Refine again to retry. The
      // hint references the original payload's entity_ids only.
      const hint = this._buildConstraintHint(insight, message);
      if (hint) {
        const fb = new Map(this._feedbackById);
        fb.set(insight.id, hint);
        this._feedbackById = fb;
        this._failModal(
          `${message}\n\n→ A constraint hint has been added below. ` +
          "Click ✨ Refine again to retry with that hint.",
        );
      } else {
        this._failModal(`Refine failed: ${message}`);
      }
    } finally {
      this._refineBusy = false;
    }
  }

  private async _previewRedaction(insight: Insight): Promise<void> {
    if (!this.hass) return;
    // Toggle off if already shown
    if (this._previewById.has(insight.id)) {
      const next = new Map(this._previewById);
      next.delete(insight.id);
      this._previewById = next;
      return;
    }
    this._previewBusy = true;
    try {
      const result =
        await this.hass.connection.sendMessagePromise<RedactionPreview>({
          type: "home_insights/redaction_preview",
          insight_id: insight.id,
        });
      const next = new Map(this._previewById);
      next.set(insight.id, result);
      this._previewById = next;
    } catch (err) {
      this._failModal(
        `Preview failed: ${this._asMessage(err)}`,
      );
    } finally {
      this._previewBusy = false;
    }
  }

  private _renderPreview(insight: Insight): TemplateResult | typeof nothing {
    const preview = this._previewById.get(insight.id);
    if (!preview) return nothing;
    const pseudonymCount = Object.keys(preview.pseudonym_map).length;
    return html`
      <div class="preview">
        <div class="preview-header">
          <strong>🛡️ What the LLM would see (${preview.privacy_mode} mode)</strong>
          <button
            class="dialog-close"
            aria-label="Close preview"
            @click=${() => this._previewRedaction(insight)}
          >×</button>
        </div>
        <div class="preview-stats">
          <span>${pseudonymCount} entit${pseudonymCount === 1 ? "y" : "ies"} pseudonymized</span>
          <span>${preview.attributes_stripped.length} attribute${preview.attributes_stripped.length === 1 ? "" : "s"} stripped</span>
          ${preview.entities_blocked.length > 0
            ? html`<span style="color: var(--error-color)">${preview.entities_blocked.length} blocked</span>`
            : nothing}
        </div>
        <pre>${JSON.stringify(preview.redacted_payload, null, 2)}</pre>
        ${pseudonymCount > 0
          ? html`
              <div class="preview-pseudonyms">
                Pseudonym map (kept locally only):
                ${Object.entries(preview.pseudonym_map).map(
                  ([real, pseudo]) => html`
                    <div>
                      <code>${real}</code> → <code>${pseudo}</code>
                    </div>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  /**
   * Detect the "hallucinated entity" validation failure pattern and build
   * a constraint hint that names the legal entity_ids from the original
   * payload. Returns null for any other error so the user just sees the
   * raw refine_failed message.
   */
  private _buildConstraintHint(insight: Insight, errorMessage: string): string | null {
    if (!/references entities not in the original/i.test(errorMessage)) {
      return null;
    }
    const allowed = this._collectEntityIds(insight.payload);
    if (allowed.length === 0) return null;
    return (
      `Use ONLY these entity_ids: ${allowed.join(", ")}. `
      + "Do not introduce any new entities. "
      + "Adding new services (e.g. light.turn_off) on the existing "
      + "entities is fine."
    );
  }

  /**
   * Mirror of the server-side _collect_entity_ids: walk the payload and
   * gather entity_id values from `entity_id` / `entity_ids` fields only.
   */
  private _collectEntityIds(value: unknown, inEntityField = false): string[] {
    if (value == null) return [];
    if (typeof value === "string") {
      if (!inEntityField) return [];
      const matches = value.match(/\b[a-z_]+\.[a-z0-9_]+\b/g) ?? [];
      return matches;
    }
    if (Array.isArray(value)) {
      const out: string[] = [];
      for (const item of value) {
        out.push(...this._collectEntityIds(item, inEntityField));
      }
      return Array.from(new Set(out));
    }
    if (typeof value === "object") {
      const out: string[] = [];
      for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
        const nestedInEntityField = inEntityField || key === "entity_id" || key === "entity_ids";
        out.push(...this._collectEntityIds(sub, nestedInEntityField));
      }
      return Array.from(new Set(out));
    }
    return [];
  }

  private _keepOriginal(insightId: string): void {
    const next = new Map(this._refinedById);
    next.delete(insightId);
    this._refinedById = next;
    this._resetRefineConversation(insightId);
    this._toast = "Kept original";
  }

  /** v1.0 RC #2: clear the multi-turn refine context for an insight. */
  private _resetRefineConversation(insightId: string): void {
    if (this._refineConversationById.has(insightId)) {
      const next = new Map(this._refineConversationById);
      next.delete(insightId);
      this._refineConversationById = next;
    }
    if (this._refineTurnsById.has(insightId)) {
      const next = new Map(this._refineTurnsById);
      next.delete(insightId);
      this._refineTurnsById = next;
    }
  }

  private async _testActions(insight: Insight, override?: Record<string, unknown>): Promise<void> {
    if (!this.hass) return;
    const which: "original" | "refined" = override ? "refined" : "original";
    this._testBusy = true;
    this._testResults = undefined;
    try {
      const payload: {
        type: string;
        insight_id: string;
        payload_override?: Record<string, unknown>;
      } = {
        type: "home_insights/test_actions",
        insight_id: insight.id,
      };
      if (override) payload.payload_override = override;
      const result = await this.hass.connection.sendMessagePromise<TestActionsResult>(payload);
      this._testResults = {
        ran: result.ran,
        error_count: result.error_count,
        results: result.results,
        tested: which,
      };
    } catch (err) {
      this._failModal(`Test actions failed: ${this._asMessage(err)}`);
    } finally {
      this._testBusy = false;
    }
  }

  private _clearTestResults(): void {
    this._testResults = undefined;
  }

  /** Heading for the payload view, based on payload_format.
   * Stops the modal from labelling a "report" or "blueprint" payload
   * as "Automation that would be created" — confusing for SetupQuality
   * tier rows and orphan_device anomalies that aren't applyable. */
  private _payloadHeading(format: string | undefined): string {
    switch (format) {
      case "automation":
        return "Automation that would be created";
      case "blueprint":
        return "Blueprint that would be created";
      case "card":
        return "Card that would be added";
      case "group":
        return "Group that would be created";
      case "scene":
        return "Scene that would be created";
      case "report":
      default:
        return "Details";
    }
  }

  private _renderPayloadView(
    insight: Insight,
    basePayload?: Record<string, unknown>,
  ): TemplateResult {
    const editing = this._editingPayloadFor.has(insight.id);
    const draft = this._payloadEditsById.get(insight.id);
    const parseError = this._payloadParseErrorById.get(insight.id);
    const rawView = basePayload ?? insight.payload;
    // v1.2.16: strip private detector metadata (underscore-prefixed
    // keys like _manual_habit, _audit) from the YAML preview so the
    // user sees what will actually be written to automations.yaml,
    // not an extra blob of "what does this even mean" detector
    // bookkeeping. The server-side writer (v1.5.34) strips the same
    // keys before write — this is the visual equivalent.
    const view = this._stripPrivateKeys(rawView);
    return html`
      <div class="payload-edit">
        <button
          @click=${() => this._togglePayloadEdit(insight, basePayload)}
          title=${editing
            ? "Discard edits and revert"
            : "Edit the payload as JSON before Apply"}
        >
          ${editing ? "✕ Cancel edit" : "✎ Edit"}
        </button>
      </div>
      ${editing
        ? html`
            <textarea
              class="payload-editor ${parseError ? "error" : ""}"
              spellcheck="false"
              .value=${draft ?? JSON.stringify(view, null, 2)}
              @input=${(e: Event) => this._onPayloadEditInput(insight.id, e)}
            ></textarea>
            ${parseError
              ? html`<div class="payload-error">${parseError}</div>`
              : nothing}
          `
        : html`<pre>${JSON.stringify(view, null, 2)}</pre>`}
    `;
  }

  /** v1.2.16 — drop top-level keys prefixed with `_` from the YAML
   *  preview. Detectors stash internal metadata under `_manual_habit`,
   *  `_audit`, `_streak`, etc. — useful for cohort dedup + fingerprinting
   *  but invisible to the user when they open automations.yaml.
   *  Returns a shallow copy; caller's object is untouched.
   *
   *  v1.2.20: keep `_*_assessment` keys visible. Those carry the
   *  v1.5.35+ grader output (timing / cooccurrence / persistence) and
   *  are the transparency layer users need to understand WHY their
   *  confidence is what it is. The server-side automation_writer
   *  (v1.5.34) strips them before write, so they never reach
   *  automations.yaml regardless of what's in the preview.
   */
  private _stripPrivateKeys(
    payload: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!payload || typeof payload !== "object") return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (!k.startsWith("_") || k.endsWith("_assessment")) {
        out[k] = v;
      }
    }
    return out;
  }

  private _renderModalError(): TemplateResult | typeof nothing {
    if (!this._modalError) return nothing;
    return html`
      <div class="error-banner" style="margin-bottom: 12px; border-radius: 6px;">
        <span>${this._modalError}</span>
        <button @click=${() => (this._modalError = undefined)}>Dismiss</button>
      </div>
    `;
  }

  private _renderTestResults(): TemplateResult | typeof nothing {
    const tr = this._testResults;
    if (!tr) return nothing;
    const allOk = tr.error_count === 0 && tr.ran > 0;
    const allFail = tr.ran === 0 && tr.error_count > 0;
    const cls = allOk ? "test-results ok" : allFail ? "test-results fail" : "test-results";
    const summary = `Tested ${tr.tested} — ${tr.ran} ran, ${tr.error_count} error${tr.error_count === 1 ? "" : "s"}`;
    return html`
      <div class=${cls}>
        <div class="test-results-header">
          <span>${summary}</span>
          <button
            class="test-results-close"
            aria-label="Close test results"
            @click=${this._clearTestResults}
          >×</button>
        </div>
        <ul>
          ${tr.results.map((r) => {
            const icon = r.ok ? "✓" : r.skipped ? "—" : "✗";
            const iconCls = r.ok ? "icon-ok" : r.skipped ? "icon-skip" : "icon-fail";
            return html`
              <li>
                <span class="icon ${iconCls}">${icon}</span>
                <div>
                  <div>
                    ${r.service ?? "(action)"}${
                      r.skipped ? " (skipped)" : ""
                    }
                  </div>
                  ${r.error
                    ? html`<div class="test-results-error">${r.error}</div>`
                    : nothing}
                </div>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  /** Auto-pick a tts.* entity if the user didn't configure one. */
  private _resolveTtsEngine(): string | undefined {
    if (this._config.tts_engine_entity_id) return this._config.tts_engine_entity_id;
    const states = this.hass?.states ?? {};
    return Object.keys(states).find((eid) => eid.startsWith("tts."));
  }

  private async _readAloud(insight: Insight): Promise<void> {
    if (!this.hass || !insight.explanation) return;
    const target = this._config.tts_target_entity_id;
    if (!target) return;
    const engine = this._resolveTtsEngine();
    if (!engine) {
      this._failModal(
        "No TTS engine found. Install one (Piper / Google Cloud / Nabu Casa) or set " +
          "tts_engine_entity_id in the card config.",
      );
      return;
    }
    this._ttsBusy = true;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "tts",
        service: "speak",
        service_data: {
          entity_id: engine,
          media_player_entity_id: target,
          message: insight.explanation,
        },
      });
      this._toast = `Speaking on ${target}`;
    } catch (err) {
      this._failModal(`TTS failed: ${this._asMessage(err)}`);
    } finally {
      this._ttsBusy = false;
    }
  }

  private _asMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    return String(err);
  }

  private _filtered(): Insight[] {
    const min = this._config.min_confidence ?? 0;
    const userMax = this._config.max_rows;
    const cap =
      userMax !== undefined
        ? userMax
        : this._autoMaxRows > 0
          ? this._autoMaxRows
          : DEFAULT_MAX_ROWS;
    const search = (this._config.search ?? "").trim().toLowerCase();
    const sortBy = this._config.sort_by ?? "confidence";
    // v1.1 panel-only chip filters. Empty array OR undefined = no filter
    // for that dimension. Empty value (`null` device_class, `null` area)
    // passes only if the corresponding filter list is empty.
    const domainSet = new Set(this._config.domain_filter ?? []);
    const areaSet = new Set(this._config.area_filter ?? []);
    const dcSet = new Set(this._config.device_class_filter ?? []);
    const detSet = new Set(this._config.detector_filter ?? []);
    const floorSet = new Set(this._config.floor_filter ?? []);
    const integSet = new Set(this._config.integration_filter ?? []);
    const labelSet = new Set(this._config.label_filter ?? []);
    const hideAlreadyAutomated = this._config.hide_already_automated === true;
    const filtered = this._insights
      .filter((i) => i.confidence >= min)
      .filter((i) => !search || i.title.toLowerCase().includes(search))
      .filter((i) =>
        domainSet.size === 0 || (i.domain != null && domainSet.has(i.domain)),
      )
      .filter((i) =>
        areaSet.size === 0 || (i.area_id != null && areaSet.has(i.area_id)),
      )
      .filter(
        (i) =>
          dcSet.size === 0 ||
          (i.device_class != null && dcSet.has(i.device_class)),
      )
      .filter((i) => detSet.size === 0 || detSet.has(i.detector))
      .filter((i) =>
        floorSet.size === 0 || (i.floor_id != null && floorSet.has(i.floor_id)),
      )
      .filter(
        (i) =>
          integSet.size === 0 ||
          (i.integration != null && integSet.has(i.integration)),
      )
      .filter(
        (i) =>
          labelSet.size === 0 ||
          (Array.isArray(i.labels) && i.labels.some((l) => labelSet.has(l))),
      )
      .filter((i) => !hideAlreadyAutomated || i.conflicts_with.length === 0);

    filtered.sort((a, b) => {
      if (sortBy === "age") {
        // Newest first
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sortBy === "detector") {
        const cmp = a.detector.localeCompare(b.detector);
        return cmp !== 0 ? cmp : b.confidence - a.confidence;
      }
      // Default: confidence (high first)
      return b.confidence - a.confidence;
    });

    // Client-side dedup pass. Works on whatever the server sent —
    // useful when the server hasn't been reloaded since the dedup
    // helper shipped, or when the store has insights from an older
    // fingerprint schema. Pure presentation transform; no WS calls.
    const deduped = this._clientSideDedup(filtered);

    // Stash the full match count so the compact tile and "Showing X
    // of Y" footer can report the TRUE count instead of the
    // post-cap subset. Was previously hard-pinned to whatever
    // max_rows said, which made the dashboard's compact tile show
    // "1 insight" even when the user had 15 to look at.
    this._totalFilteredCount = deduped.length;
    return deduped.slice(0, cap);
  }

  /** Group insights by (detector, normalized title). Rows that share a
   *  normalized title AND a common domain get merged: highest-confidence
   *  one becomes the representative, others collapse into cohort_members.
   *  Idempotent — if the server already merged them (cohort_label set on
   *  every row of the bucket), pass through unchanged. */
  private _clientSideDedup(rows: Insight[]): Insight[] {
    if (rows.length < 2) return rows;
    const buckets = new Map<string, Insight[]>();
    for (const r of rows) {
      // Strip entity_id-shaped tokens from the title to find similar rows.
      const norm = (r.title || "").replace(
        /\b[a-z_]+\.[A-Za-z0-9_]+\b/g,
        "<E>",
      );
      // Include the row's domain in the bucket key so mixed-domain
      // titles never lump together. Without this split, an NVR with 35
      // binary_sensor offline rows + 11 switch offline rows all
      // bucketed into one mixed-domain bucket and then bailed out at
      // the "Mixed domains — keep separate" branch below, leaving the
      // user with 46 individual rows instead of 2 cohort representatives.
      const domain = r.domain ?? "";
      const key = `${r.detector}|${r.kind}|${norm}|${domain}`;
      const arr = buckets.get(key);
      if (arr) arr.push(r);
      else buckets.set(key, [r]);
    }
    const out: Insight[] = [];
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) {
        out.push(bucket[0]);
        continue;
      }
      // Collect all entity_ids referenced by the bucket.
      const allEids = new Set<string>();
      for (const ins of bucket) {
        const fp = ins.fingerprint as Record<string, unknown> | undefined;
        if (fp) {
          for (const k of [
            "entity_id",
            "leader_entity_id",
            "follower_entity_id",
            "target_entity_id",
          ]) {
            const v = fp[k];
            if (typeof v === "string" && v.includes(".")) allEids.add(v);
          }
        }
        // Also pick up cohort_members from server-side merges so a
        // partially-merged bucket folds together cleanly.
        for (const m of ins.cohort_members ?? []) {
          if (typeof m === "string" && m.includes(".")) allEids.add(m);
        }
      }
      const eidList = Array.from(allEids).sort();
      if (eidList.length < 2) {
        out.push(...bucket);
        continue;
      }
      const domains = new Set(
        eidList.map((e) => e.split(".", 1)[0]).filter(Boolean),
      );
      let label: string;
      if (domains.size === 1) {
        const prefix = this._longestCommonPrefix(eidList);
        label = prefix ?? `${[...domains][0]}.* (cohort)`;
      } else {
        // Mixed domains — unusual but possible. Keep separate.
        out.push(...bucket);
        continue;
      }
      const rep = bucket.reduce((best, x) =>
        (x.confidence ?? 0) > (best.confidence ?? 0) ? x : best,
      );
      const others = bucket.length - 1;
      // Idempotent: if the server already added the suffix, don't double.
      const baseTitle = (rep.title || "").replace(
        / \(\+\d+ similar entities[^)]*\)$/,
        "",
      );
      const merged: Insight = {
        ...rep,
        title: `${baseTitle} (+${others} similar entities: ${label})`,
        cohort_members: eidList,
        cohort_label: label,
      };
      out.push(merged);
    }
    // Preserve sort order: re-sort by the original sortBy criterion.
    out.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    return out;
  }

  private _longestCommonPrefix(eids: string[]): string | null {
    if (eids.length < 2) return null;
    const domain = eids[0].split(".", 1)[0];
    const names = eids.map((e) => e.split(".", 2)[1] ?? "");
    let prefix = names[0];
    for (const n of names.slice(1)) {
      while (prefix && !n.startsWith(prefix)) prefix = prefix.slice(0, -1);
      if (!prefix) return null;
    }
    prefix = prefix.replace(/_+$/, "");
    if (prefix.length < 4) return null;
    return `${domain}.${prefix}_*`;
  }

  /** Bucket insights by the configured group_by key. Returns ordered
   *  pairs so the render can produce stable section ordering. */
  private _grouped(rows: Insight[]): Array<[string, Insight[]]> {
    const key = this._config.group_by ?? "none";
    if (key === "none") return [["", rows]];
    const buckets = new Map<string, Insight[]>();
    for (const row of rows) {
      // Prefer the friendly name when one is available — the area_id /
      // floor_id are opaque GUIDs in the registry, useless as section
      // headers. integration is already a label-ish string ("hue",
      // "tuya", "mqtt"). Fall back to "(no area)" / "(no floor)" /
      // "(no integration)" so a single bucket collects un-tagged rows
      // and the user can spot what slipped through the registry.
      const groupKey =
        key === "area"
          ? row.area_name ?? row.area_id ?? "(no area)"
          : key === "floor"
            ? row.floor_name ?? row.floor_id ?? "(no floor)"
            : key === "integration"
              ? row.integration ?? "(no integration)"
              : key === "label"
                ? (Array.isArray(row.labels) && row.labels.length > 0
                    ? row.labels[0]
                    : "(no label)")
                : key === "detector"
                  ? row.detector
                  : "";
      const existing = buckets.get(groupKey);
      if (existing) existing.push(row);
      else buckets.set(groupKey, [row]);
    }
    return Array.from(buckets.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }

  private _openDialog(insightId: string): void {
    this._dialogId = insightId;
    this._testResults = undefined;
    this._modalError = undefined;
  }

  private _closeDialog(): void {
    if (this._dialogId) {
      // Discard rename + payload edits when the modal closes without applying.
      const id = this._dialogId;
      const renames = new Map(this._renameEdits);
      renames.delete(id);
      this._renameEdits = renames;
      const drafts = new Map(this._payloadEditsById);
      drafts.delete(id);
      this._payloadEditsById = drafts;
      const editing = new Set(this._editingPayloadFor);
      editing.delete(id);
      this._editingPayloadFor = editing;
      const errs = new Map(this._payloadParseErrorById);
      errs.delete(id);
      this._payloadParseErrorById = errs;
    }
    this._dialogId = undefined;
    this._testResults = undefined;
    this._modalError = undefined;
  }

  private _renderModeBadge(mode: PrivacyMode | undefined): TemplateResult | typeof nothing {
    if (!mode) return nothing;
    const cls = `badge badge-${mode}`;
    const label = mode === "off"
      ? "🚫 Off"
      : mode === "local"
        ? "🟢 Local"
        : "🟡 Cloud";
    return html`<span class=${cls} title="Privacy mode: ${mode}">${label}</span>`;
  }

  private _renderHeader(): TemplateResult {
    const title = this._config.title ?? "HA Insights";
    // v1.2.25: subtitle now describes STATE, not the version. Use the
    // total filtered count (already stashed by _filtered() before
    // truncation). Falls back to "Connecting…" while the hello
    // handshake is in flight. Protocol/version moves to the title's
    // tooltip so it stays available for debug without burning chrome.
    const count = this._totalFilteredCount;
    const sub = this._hello
      ? `${count} ${count === 1 ? "insight" : "insights"}`
      : "Connecting…";
    const versionTooltip = this._hello
      ? `${title} · v${this._hello.integration_version} · WS protocol ${this._hello.ws_protocol_version}`
      : title;
    return html`
      <div class="header">
        <div class="titles">
          <div class="title" title=${versionTooltip}>
            ${title} ${this._renderModeBadge(this._hello?.privacy_mode)}
          </div>
          <div class="subtitle">${sub}</div>
        </div>
        <button
          class="history-toggle ${this._showHistory ? "history-toggle-on" : ""}"
          title=${this._showHistory
            ? "Hide retired / dismissed / snoozed insights"
            : "Show retired / dismissed / snoozed insights"}
          aria-pressed=${this._showHistory ? "true" : "false"}
          @click=${this._toggleHistory}
        >
          ${this._showHistory ? "📚 Active only" : "📚 History"}
        </button>
        <a
          class="view-all"
          href="/ha-insights"
          title="Open the full HA Insights panel"
        >View all
          <ha-icon icon="mdi:arrow-right"></ha-icon>
        </a>
      </div>
    `;
  }

  private _renderCompactTile(_rows: Insight[]): TemplateResult {
    // Report the FULL filter-matching count, not the cap-clipped one.
    // _filtered() stashes this for us before slicing.
    const count = this._totalFilteredCount;
    const label = count === 0
      ? "No insights yet — patterns will appear as your home settles in"
      : count === 1
        ? "1 insight ready to review"
        : `${count} insights ready to review`;
    return html`
      <a class="compact-tile" href="/ha-insights">
        <div>
          <div class="count">${count} ${count === 1 ? "insight" : "insights"}</div>
          <div class="label">${label}</div>
        </div>
        <div class="arrow">→</div>
      </a>
    `;
  }

  private _renderSkewBanner(): TemplateResult | typeof nothing {
    if (!this._hello) return nothing;
    if (this._hello.ws_protocol_version === CARD_PROTOCOL_VERSION) return nothing;
    return html`
      <div class="skew-banner">
        Protocol mismatch — card expects v${CARD_PROTOCOL_VERSION}, integration is
        v${this._hello.ws_protocol_version}. Update one or the other.
      </div>
    `;
  }

  /** v1.5.13 — Render cohort dropdown rows with per-member 🔌 integration
   *  and 🏷️ external-app badges. Falls back to plain entity_id chips
   *  when the WS payload predates the cohort_member_info field. */
  private _renderCohortMembers(
    insight: Insight,
    members: string[],
  ): TemplateResult[] {
    const info = insight.cohort_member_info;
    if (!Array.isArray(info) || info.length === 0) {
      // Legacy / pre-v1.5.13 path — just the entity_id chip.
      return members.map(
        (m) => html`<span class="cohort-member-chip">${m}</span>`,
      );
    }
    // Build a lookup so we render members in the order of `cohort_members`
    // (canonical sort) but enriched with the metadata.
    const byId = new Map<
      string,
      { integration?: string | null; external_source?: string | null }
    >();
    for (const m of info) {
      byId.set(m.entity_id, {
        integration: m.integration,
        external_source: m.external_source,
      });
    }
    return members.map((eid) => {
      const meta = byId.get(eid);
      return html`<span class="cohort-member-chip">
        <span class="cohort-member-id">${eid}</span>
        ${meta?.integration
          ? html`<span
              class="cohort-member-badge cohort-member-int"
              title="Source integration"
            >🔌 ${meta.integration}</span>`
          : nothing}
        ${meta?.external_source
          ? html`<span
              class="cohort-member-badge cohort-member-ext"
              title="Schedule likely lives in ${meta.external_source}, not HA"
            >🏷️ ${meta.external_source}</span>`
          : nothing}
      </span>`;
    });
  }

  private _renderRow(insight: Insight): TemplateResult {
    const confidencePct = Math.round(insight.confidence * 100);
    const confidenceClass = this._confidenceClass(insight.confidence);
    const ageLabel = this._formatAge(insight.created_at);
    const expanded = this._expandedCohorts.has(insight.id);
    const members = insight.cohort_members ?? [];
    const hasCohort = members.length > 0;
    // Audit-specific finding list: pulled from payload.observations
    // (set by the AutomationAuditDetector). Rendered as a collapsible
    // findings panel beneath the title row so the user sees the
    // observations at a glance.
    const auditObservations = this._auditObservationsFor(insight);
    const auditFixSummaries = this._auditFixSummariesFor(insight);
    const auditExpanded = this._expandedCohorts.has(`audit:${insight.id}`);
    return html`
      <div class="row" @click=${() => this._openDialog(insight.id)}>
        <div class="row-title">
          ${this._displayTitle(insight)}
          ${this._renderCouplingBadge(insight)}
          ${this._renderDirectionalityBadge(insight)}
          ${this._renderEntityAgeBadge(insight)}
          ${hasCohort
            ? html` <button
                class="pill-action"
                style="margin-left:6px;"
                aria-label="${expanded ? "Hide" : "Show"} ${members.length} cohort members"
                aria-expanded="${expanded}"
                title="${expanded ? "Hide" : "Show"} the ${members.length} cohort members"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._toggleCohortExpansion(insight.id);
                }}
              >${expanded ? "▾ hide" : `▸ show ${members.length}`}</button>`
            : nothing}
          ${auditObservations.length > 0
            ? html` <button
                class="pill-action"
                style="margin-left:6px;"
                aria-label="${auditExpanded ? 'Hide' : 'Show'} ${auditObservations.length} audit finding${auditObservations.length === 1 ? '' : 's'}"
                aria-expanded="${auditExpanded}"
                title="${auditExpanded ? 'Hide' : 'Show'} the ${auditObservations.length} audit finding${auditObservations.length === 1 ? '' : 's'}"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._toggleCohortExpansion(`audit:${insight.id}`);
                }}
              >${auditExpanded
                ? '▾ hide findings'
                : `▸ ${auditObservations.length} finding${auditObservations.length === 1 ? '' : 's'}`}</button>`
            : nothing}
        </div>
        ${auditObservations.length > 0 && auditExpanded
          ? html`<div
              class="audit-findings"
              @click=${(e: Event) => e.stopPropagation()}
            >
              <ul>
                ${auditObservations.map(
                  (o) => html`<li title="${o.kind}">${o.text}</li>`,
                )}
              </ul>
              ${auditFixSummaries.length > 0
                ? html`<div class="audit-fixes">
                    <strong>🔧 Auto-fix preview:</strong>
                    <ul>
                      ${auditFixSummaries.map(
                        (s) => html`<li>${s}</li>`,
                      )}
                    </ul>
                  </div>`
                : nothing}
            </div>`
          : nothing}
        ${hasCohort && expanded
          ? html`<div
              class="cohort-members"
              @click=${(e: Event) => e.stopPropagation()}
            >${this._renderCohortMembers(insight, members)}</div>`
          : nothing}
        <div
          class="row-meta-primary"
          @click=${(e: Event) => e.stopPropagation()}
          title="Click the title to open insight details — these badges show context only."
        >
          <span class="pill ${confidenceClass}">confidence ${confidencePct}%</span>
          ${this._renderMaturityPill(insight)}
          ${insight.applied_at
            ? html`<span
                class="pill"
                style="background: rgba(76, 175, 80, 0.18); color: var(--success-color, #2e7d32);"
                title="Applied at ${insight.applied_at}"
              >✓ applied</span>`
            : nothing}
          ${insight.conflicts_with.length > 0
            ? this._renderAutomationPill(
                "🔁 already automated",
                "var(--warning-color)",
                "HA noticed this pattern, but you already have an automation that covers it",
                insight.conflicts_with_links ?? insight.conflicts_with.map((a) => ({ alias: a })),
              )
            : nothing}
          ${insight.referenced_in_automations &&
          insight.referenced_in_automations.length > 0 &&
          insight.conflicts_with.length === 0
            ? this._renderAutomationPill(
                `🤖 in ${insight.referenced_in_automations.length} ${insight.referenced_in_automations.length === 1 ? "automation" : "automations"}`,
                "var(--secondary-text-color)",
                "The entities in this insight are referenced in your existing automation(s)",
                insight.referenced_in_automations_links ?? insight.referenced_in_automations.map((a) => ({ alias: a })),
              )
            : nothing}
          ${this._renderTimingPill(insight)}
          ${insight.explanation
            ? html`<span class="pill" title="LLM explanation available">💬 explained</span>`
            : nothing}
          ${insight.detector === "automation_audit" && insight.payload_format === "report"
            ? html`<button
                class="pill-action"
                ?disabled=${this._auditSuggestBusy === insight.id}
                title="Ask the LLM for concrete YAML edits based on the audit findings"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  void this._runAuditSuggest(insight);
                }}
              >${this._auditSuggestBusy === insight.id ? "Thinking…" : "🤖 Suggest"}</button>`
            : nothing}
          ${insight.detector === "automation_audit" && insight.payload_format === "automation"
            ? html`<button
                class="pill-action"
                title="Preview the deterministic fix as a side-by-side diff (no LLM cost)"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  void this._previewDeterministicAudit(insight);
                }}
              >📋 Preview</button>`
            : nothing}
          ${insight.payload_format === "automation" && !insight.applied_at
            ? html`<button
                class="pill-action"
                ?disabled=${this._suggestAddBusy === insight.id}
                title="Find candidate entities to add to this automation's action block. Deterministic, no LLM tokens."
                @click=${(e: Event) => {
                  e.stopPropagation();
                  void this._openSuggestAddDialog(insight);
                }}
              >${this._suggestAddBusy === insight.id ? "Loading…" : "💡 Add"}</button>`
            : nothing}
        </div>
        <div
          class="row-meta-secondary"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${this._renderSecondaryMeta(insight, ageLabel)}
        </div>
      </div>
    `;
  }

  /** v1.2.25: tiered row meta — secondary line carries identity context
   *  (detector, area, integration, age, external source) as plain text
   *  separated by middle-dots. Trust pill dropped from rows because the
   *  card header already shows the privacy mode; per-row trust still
   *  surfaces in the insight modal where the header is hidden.
   */
  private _renderSecondaryMeta(
    insight: Insight,
    ageLabel: string,
  ): TemplateResult {
    const parts: string[] = [insight.detector];
    if (insight.area_id) {
      parts.push(insight.area_name ?? insight.area_id);
    }
    if (insight.integration) {
      parts.push(insight.integration);
    }
    if (ageLabel) {
      parts.push(ageLabel);
    }
    if (insight.external_source) {
      parts.push(`managed by ${insight.external_source}`);
    }
    return html`${parts.map(
      (part, i) =>
        html`${i > 0 ? html`<span class="sep">·</span>` : nothing}${part}`,
    )}`;
  }

  /** Pull the observations array off an audit insight's payload.
   *  Returns [] for non-audit insights. Tolerates payloads where
   *  `observations` is missing or malformed. */
  private _auditObservationsFor(
    insight: Insight,
  ): Array<{ kind: string; text: string }> {
    if (insight.detector !== "automation_audit") return [];
    const payload = insight.payload as Record<string, unknown> | undefined;
    if (!payload) return [];
    // Deterministic-fix audits stash observations under _audit.observations.
    const auditMeta = (payload._audit as Record<string, unknown> | undefined);
    const raw = (auditMeta?.observations as unknown) ?? payload.observations;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null)
      .map((o) => ({
        kind: typeof o.kind === "string" ? o.kind : "",
        text: typeof o.text === "string" ? o.text : "",
      }))
      .filter((o) => o.text.length > 0);
  }

  /** For deterministic-fix audit insights (payload_format = automation
   *  with _audit metadata), surface the human-readable summaries of
   *  what was changed. Empty list for the LLM-suggest path or reports. */
  private _auditFixSummariesFor(insight: Insight): string[] {
    if (insight.detector !== "automation_audit") return [];
    const payload = insight.payload as Record<string, unknown> | undefined;
    if (!payload) return [];
    const auditMeta = (payload._audit as Record<string, unknown> | undefined);
    const raw = auditMeta?.fix_summaries;
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is string => typeof s === "string");
  }

  private _confidenceClass(confidence: number): string {
    if (confidence >= 0.8) return "confidence-high";
    if (confidence >= 0.5) return "confidence-medium";
    return "confidence-low";
  }

  /** v1.2.17 — Surface the lib/timing_likelihood assessment as a small
   *  row pill so users see WHY a confidence is what it is.
   *
   *  Three tiers:
   *    DEVICE_LIKELY  → 🤖 device-managed pill, warning color. The
   *      timing is statistically too tight to be a human action (BLE
   *      toothbrush firing OFF exactly 2 min after ON, solar inverter
   *      at sunrise via cloud polling, etc). Confidence already cut
   *      by 80% server-side; the pill explains the demotion.
   *    TIGHT_PATTERN → 🤖 tight-pattern pill, info color. Plausibly
   *      human (alarm-driven routine) but tight enough that a device
   *      timer is also possible. Confidence cut by 15%; pill prompts
   *      the user to think about it.
   *    HUMAN_LIKELY / INSUFFICIENT_DATA → nothing rendered.
   *
   *  Backend ships `_timing_assessment` in the payload (underscore-
   *  prefixed → stripped before automations.yaml write). The card
   *  reads it for rendering only.
   */
  private _renderTimingPill(insight: Insight): TemplateResult | typeof nothing {
    const payload = insight.payload as Record<string, unknown> | undefined;
    if (!payload) return nothing;
    // v1.2.19: read all three grader assessments (the v1.5.38
    // composite payload-keys output). Any one signal alone produces a
    // pill; multiple signals stack into a multi-line tooltip.
    const t = payload._timing_assessment as
      | { timing_class?: string; reason?: string }
      | undefined;
    const c = payload._cooccurrence_assessment as
      | { cooccurrence_class?: string; reason?: string }
      | undefined;
    const p = payload._persistence_assessment as
      | { persistence_class?: string; reason?: string }
      | undefined;
    // v1.5.40: 4th grader — transition_entropy (context diversity).
    // Optional; present only when detector passed distinct_entity_counts.
    const e = payload._transition_entropy_assessment as
      | { transition_entropy_class?: string; reason?: string }
      | undefined;
    const timingClass = typeof t?.timing_class === "string" ? t.timing_class : "";
    const cooccClass = typeof c?.cooccurrence_class === "string"
      ? c.cooccurrence_class
      : "";
    const persClass = typeof p?.persistence_class === "string"
      ? p.persistence_class
      : "";
    const entropyClass = typeof e?.transition_entropy_class === "string"
      ? e.transition_entropy_class
      : "";
    const isDeviceTiming = timingClass === "device_likely";
    const isTightTiming = timingClass === "tight_pattern";
    const isIsolatedCoocc = cooccClass === "isolated";
    const isAmbiguousCoocc = cooccClass === "ambiguous";
    const isFixedPersistence = persClass === "fixed_cycle";
    const isTightPersistence = persClass === "tight_duration";
    const isNovelEntropy = entropyClass === "novel_context";
    if (
      !isDeviceTiming
      && !isTightTiming
      && !isIsolatedCoocc
      && !isAmbiguousCoocc
      && !isFixedPersistence
      && !isTightPersistence
      && !isNovelEntropy
    ) {
      return nothing;
    }
    // Multi-line tooltip — each signal contributes one paragraph so
    // the user sees the full evidence chain. Lit's title attribute
    // renders \n\n as a real line break in most browsers.
    const reasons: string[] = [];
    if (t?.reason && (isDeviceTiming || isTightTiming)) reasons.push(t.reason);
    if (c?.reason && (isIsolatedCoocc || isAmbiguousCoocc)) reasons.push(c.reason);
    if (p?.reason && (isFixedPersistence || isTightPersistence)) reasons.push(p.reason);
    if (e?.reason && isNovelEntropy) reasons.push(e.reason);
    const reason = reasons.join("\n\n") || "Likelihood analysis details unavailable";
    // Severity escalation: any one strong device signal → "device-
    // managed" (warning color). Multiple soft signals stacking also
    // escalate. Otherwise tight-pattern (info color).
    const strongSignals = (isDeviceTiming ? 1 : 0)
      + (isIsolatedCoocc ? 1 : 0)
      + (isFixedPersistence ? 1 : 0);
    const softSignals = (isTightTiming ? 1 : 0)
      + (isAmbiguousCoocc ? 1 : 0)
      + (isTightPersistence ? 1 : 0)
      + (isNovelEntropy ? 1 : 0);
    const isDeviceManaged = strongSignals >= 1 || (strongSignals + softSignals) >= 3;
    if (isDeviceManaged) {
      return html`<span
        class="pill"
        style="color: var(--warning-color, #ef6c00); background: rgba(239, 108, 0, 0.08);"
        title=${reason}
      >🤖 device-managed</span>`;
    }
    return html`<span
      class="pill"
      style="color: var(--info-color, #2196f3); background: rgba(33, 150, 243, 0.08);"
      title=${reason}
    >🤖 tight-pattern</span>`;
  }

  /** Rewrite the title for already-shadowed insights so it doesn't read
   *  as a CTA. The detector emits "Pattern X. Automate this?" but when
   *  conflict_scanner has already matched an existing automation, that
   *  question is misleading — the answer is "no, you already did".
   *
   *  Server-side titles drive cohort-dedup grouping and notification
   *  payloads, so this transform is presentation-only. The 🔁 pill +
   *  conflicts_with_links still tell the full story.
   *
   *  Patterns stripped (case-insensitive trailing CTA):
   *    - "Automate this?" / "Automate it?" / "Automate it" / "Automate."
   *    - "Build automation?"
   *    - "Auto-off after N min?"  ← long_tail also reads as a CTA
   */
  private _displayTitle(insight: Insight): string {
    if (insight.conflicts_with.length === 0) return insight.title;
    return insight.title.replace(
      /\s*(?:Automate\s+(?:this|it)\??|Build\s+automation\??)\s*$/i,
      "",
    ).trim();
  }

  /** v1.4 (integration v1.9.1+): 🔀 directionality badge for
   *  lagged_correlation pairs.
   *
   *  The integration runs transfer entropy on every detected pair
   *  (`lib/transfer_entropy.py`) and stamps the result on the payload.
   *  We render three states, each with a distinct visual:
   *
   *  - **direction "x_to_y"** with non-trivial flow → ✅ "direction
   *    confirmed" (positive signal — the suggestion is well-grounded).
   *  - **direction "y_to_x"** with non-trivial flow → ⚠️ "direction
   *    looks reversed" (the proposed leader is actually the follower;
   *    the integration already demoted confidence ×0.5 so it usually
   *    falls below MIN_CONFIDENCE_TO_EMIT, but if one slipped through
   *    the user should know).
   *  - **direction "symmetric"** with both TEs above noise → 🔀
   *    "no clear direction" (both entities probably driven by a
   *    third factor like time of day, not by each other).
   *
   *  We skip rendering entirely when:
   *    - assessment wasn't run (`assessed: false`)
   *    - both TEs are below the noise floor (uninformative — usually
   *      sparse data; surfacing a badge would be misleading)
   *
   *  The integration is the source of truth for *what* to demote;
   *  the card is the source of truth for *how* to surface the
   *  rationale to the user. See `lib/transfer_entropy.py` and
   *  `detectors/lagged_correlation.py`.
   */
  private _renderDirectionalityBadge(insight: Insight): unknown {
    const payload = insight.payload ?? {};
    const dir = (payload as Record<string, unknown>)._directionality as
      | {
          assessed?: boolean;
          direction?: string;
          te_x_to_y?: number;
          te_y_to_x?: number;
          asymmetry?: number;
          confidence?: number;
          n_samples?: number;
        }
      | undefined;
    if (!dir || dir.assessed !== true) return nothing;
    // Noise-floor cutoff matches NOISE_FLOOR_BITS in lib/transfer_entropy.py.
    // Mismatching this would surface badges the integration considered
    // uninformative — keep them in sync.
    const NOISE_FLOOR_BITS = 0.05;
    const txy = typeof dir.te_x_to_y === "number" ? dir.te_x_to_y : 0;
    const tyx = typeof dir.te_y_to_x === "number" ? dir.te_y_to_x : 0;
    if (txy < NOISE_FLOOR_BITS && tyx < NOISE_FLOOR_BITS) return nothing;

    let icon = "🔀";
    let label = "no clear direction";
    let tooltip = "";
    switch (dir.direction) {
      case "x_to_y":
        icon = "✅";
        label = "direction confirmed";
        tooltip = (
          `Transfer entropy ${txy.toFixed(2)} bits (forward) vs `
          + `${tyx.toFixed(2)} bits (reverse) — the leader's past `
          + "genuinely reduces uncertainty about the follower's future. "
          + "This suggestion is well-grounded."
        );
        break;
      case "y_to_x":
        icon = "⚠️";
        label = "direction reversed";
        tooltip = (
          `Transfer entropy ${tyx.toFixed(2)} bits (reverse) vs `
          + `${txy.toFixed(2)} bits (forward) — the proposed leader `
          + "looks like the FOLLOWER. The entities may be mislabeled "
          + "or the causation runs the other way. Inspect before applying."
        );
        break;
      case "symmetric":
        icon = "🔀";
        label = "no clear direction";
        tooltip = (
          `Forward and reverse transfer entropy are similar `
          + `(${txy.toFixed(2)} vs ${tyx.toFixed(2)} bits) — both `
          + "entities are probably driven by a third factor (time of "
          + "day, a manual ritual, an unseen scene) rather than by "
          + "each other. Consider whether automation adds value."
        );
        break;
      default:
        return nothing;
    }
    return html`<span
      class="pill-action directionality-badge"
      style="margin-left:6px;"
      role="img"
      aria-label="${tooltip}"
      title="${tooltip}"
    >${icon} ${label}</span>`;
  }

  /** v1.7: 🔗 badge for tight-coupled pairs.
   *
   *  Cooccurrence / lagged / button-press detectors stamp a `_coupling`
   *  block on the payload when the leader→follower lag looks like
   *  device-internal logic (ESPHome on_press, Z-Wave central scene,
   *  Zigbee binding) rather than a real user habit. We render the
   *  badge only for TIGHT tier — LOOSE is too ambiguous to surface,
   *  NONE is the normal case.
   *
   *  The integration also demotes confidence on TIGHT pairs so they
   *  rank below uncoupled suggestions; the badge tells the user
   *  WHY the insight is muted rather than hidden.
   */
  private _renderCouplingBadge(insight: Insight): unknown {
    const payload = insight.payload ?? {};
    const coupling = (payload as Record<string, unknown>)._coupling as
      | { tier?: string; median_lag_ms?: number; consistency?: number }
      | undefined;
    if (!coupling || coupling.tier !== "TIGHT") return nothing;
    const lag = typeof coupling.median_lag_ms === "number"
      ? `${Math.round(coupling.median_lag_ms)}ms`
      : "<unknown>";
    const cons = typeof coupling.consistency === "number"
      ? `${Math.round(coupling.consistency * 100)}%`
      : "<unknown>";
    const tooltip = (
      `These entities change together within ~${lag} `
      + `(${cons} consistency) — looks like a device binding or a `
      + "pre-existing automation, not a new pattern to automate."
    );
    return html`<span
      class="pill-action coupling-badge"
      style="margin-left:6px;"
      role="img"
      aria-label="${tooltip}"
      title="${tooltip}"
    >🔗 coupled</span>`;
  }

  /** v1.12.11: 🆕 badge for insights whose primary entity was added to
   *  HA within the last NEWLY_ADDED_THRESHOLD_DAYS (14) days.
   *
   *  Surfaces the dataset-window limit so users know why a brand-new
   *  entity's insight may look noisy or hedged — there literally isn't
   *  enough history yet. Detectors like state_shift already gate
   *  internally; this badge is the visible explanation.
   *
   *  Server attaches `entity_age_days` only when within threshold, so
   *  absence == "not newly added" (or pre-HA-2024.10 registry without
   *  created_at, in which case we can't tell). Either way, no badge.
   */
  private _renderEntityAgeBadge(insight: Insight): unknown {
    const age = insight.entity_age_days;
    if (typeof age !== "number") return nothing;
    let label: string;
    if (age === 0) label = "added today";
    else if (age === 1) label = "added yesterday";
    else label = `added ${age} days ago`;
    const tooltip = (
      `This entity was ${label.replace("added ", "")} `
      + "in Home Assistant. Detectors have limited history to work "
      + "from, so any pattern, anomaly, or shift may not be reliable "
      + "yet — give it a couple of weeks before acting on it."
    );
    return html`<span
      class="pill-action entity-age-badge"
      style="margin-left:6px;"
      role="img"
      aria-label="${tooltip}"
      title="${tooltip}"
    >🆕 ${label}</span>`;
  }

  /** v1.7.7: render the "Managed devices" section in the detail dialog.
   *
   *  Lists every device this insight references with a toggle to mark
   *  it "managed externally" — a user assertion that the device handles
   *  its own logic and HA Insights should stop surfacing patterns from
   *  it. Companion to the 🔗 coupling badge: that one INFERS coupling
   *  from timing; this one is the explicit user override.
   *
   *  Shown only when the insight carries `referenced_devices` (server
   *  v1.7.7+) AND at least one device is present. Cohort insights with
   *  many member devices show all of them.
   *
   *  Toggling fires `home_insights/set_device_managed`. After the
   *  toggle, currently-emitted insights from the device stay in the
   *  store (they'll be cleaned up by the next scan's stale-sweep) but
   *  any future scan won't surface new patterns. We optimistically
   *  update the local insight's device.managed flag so the toggle
   *  reflects immediately.
   */
  private _renderManagedDevicesSection(insight: Insight): TemplateResult | typeof nothing {
    const devices = insight.referenced_devices;
    if (!devices || devices.length === 0) return nothing;
    return html`
      <h4>Devices</h4>
      <div class="managed-devices">
        <p style="margin-top:0; color: var(--secondary-text-color); font-size: 0.92em;">
          Mark a device "managed externally" to stop surfacing patterns
          from it. Different from automatic device-managed detection
          — this is your explicit assertion.
        </p>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${devices.map((d) => html`
            <li style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--divider-color);">
              <span style="flex: 1;">
                <strong>${d.name}</strong>
                <span style="color: var(--secondary-text-color); font-size: 0.85em; margin-left: 6px;">${d.device_id.slice(0, 8)}…</span>
              </span>
              ${d.managed
                ? html`<button
                    class="pill-action"
                    style="background: var(--warning-color, #ef6c00); color: white; border-color: var(--warning-color, #ef6c00);"
                    title="Currently suppressed. Click to restore — future patterns from this device will surface again."
                    @click=${() => this._setDeviceManaged(d.device_id, false)}
                  >✓ Suppressed — restore</button>`
                : html`<button
                    class="pill-action"
                    title="Stop surfacing future insights from this device. Existing insights stay until next scan."
                    @click=${() => this._setDeviceManaged(d.device_id, true)}
                  >🔇 Suppress device</button>`
              }
            </li>
          `)}
        </ul>
      </div>
    `;
  }

  /** Toggle a device's managed-externally flag. Optimistic UI: flip
   *  the local insight's `referenced_devices[].managed` immediately,
   *  then call the server. On failure, log + leave the optimistic
   *  state (user can retry; next scan will re-sync). */
  private async _setDeviceManaged(deviceId: string, managed: boolean): Promise<void> {
    // Optimistic local update
    this._insights = this._insights.map((i) => {
      if (!i.referenced_devices) return i;
      if (!i.referenced_devices.some((d) => d.device_id === deviceId)) return i;
      return {
        ...i,
        referenced_devices: i.referenced_devices.map((d) =>
          d.device_id === deviceId ? { ...d, managed } : d
        ),
      };
    });
    try {
      await this.hass!.callWS({
        type: "home_insights/set_device_managed",
        device_id: deviceId,
        managed,
      });
      this._toast = managed
        ? "Device suppressed. New patterns from it won't appear."
        : "Device restored. Future patterns from it will appear again.";
    } catch (err) {
      // Revert optimistic update
      this._insights = this._insights.map((i) => {
        if (!i.referenced_devices) return i;
        if (!i.referenced_devices.some((d) => d.device_id === deviceId)) return i;
        return {
          ...i,
          referenced_devices: i.referenced_devices.map((d) =>
            d.device_id === deviceId ? { ...d, managed: !managed } : d
          ),
        };
      });
      this._toast = `Failed: ${this._asMessage(err)}`;
    }
  }

  /** Render an "🔁 already automated" or "🤖 in N automations" pill.
   *
   *  Single match (N=1): plain anchor + inline ✏️. Click = open the
   *  one matching automation. Fast path; no extra clicks.
   *
   *  Multiple matches (N>1): `<details>` expander where the summary IS
   *  the pill, and each automation appears below as its own clickable
   *  row with its own ✏️ Refine button. Native `<details>` gives us
   *  expand/collapse for free — no popover state, no click-outside
   *  handling. Earlier version silently picked the first link and the
   *  user couldn't reach the others; this fixes that.
   *
   *  No-id legacy YAML: same fallback as before — text only, no URL,
   *  Refine button hidden. */
  private _renderAutomationPill(
    label: string,
    color: string,
    leadText: string,
    links: Array<{ alias: string; id?: string; url?: string }>,
  ): TemplateResult {
    const aliases = links.map((l) => l.alias);
    const tooltip = `${leadText}: ${aliases.join(", ")}`;

    // Single-link fast path. Keeps the row compact — most insights only
    // hit one automation, and forcing an extra click feels punitive.
    if (links.length <= 1) {
      const only = links[0];
      const url = only?.url ?? "/config/automation/dashboard";
      return html`<span class="automation-pill-group">
        <a
          class="pill"
          href=${url}
          target="_top"
          style="color: ${color}; text-decoration: none; cursor: pointer;"
          title="${tooltip} — click to open the automation editor"
          @click=${(e: Event) => e.stopPropagation()}
        >${label}</a>
        ${only?.id
          ? html`<button
              class="pill-action"
              aria-label="Refine automation '${only.alias}' with AI"
              title="Refine this automation with AI"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._openRefineAutomationModal(only.id!, only.alias);
              }}
            >✏️</button>`
          : nothing}
      </span>`;
    }

    // Multi-link expander. Native <details> handles the open/close state.
    return html`<details
      class="automation-pill-details"
      @click=${(e: Event) => e.stopPropagation()}
    >
      <summary
        class="pill"
        style="color: ${color}; cursor: pointer; list-style: none;"
        title="${tooltip} — click to expand"
      >${label} ▾</summary>
      <div class="automation-pill-menu">
        ${links.map((link) => {
          const url = link.url ?? "/config/automation/dashboard";
          return html`<div class="automation-pill-row">
            <a
              class="automation-pill-link"
              href=${url}
              target="_top"
              title="Open '${link.alias}' in the automation editor"
              @click=${(e: Event) => e.stopPropagation()}
            >${link.alias}</a>
            ${link.id
              ? html`<button
                  class="pill-action"
                  aria-label="Refine automation '${link.alias}' with AI"
                  title="Refine '${link.alias}' with AI"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._openRefineAutomationModal(link.id!, link.alias);
                  }}
                >✏️</button>`
              : nothing}
          </div>`;
        })}
      </div>
    </details>`;
  }

  /** Open the refine-existing-automation modal. Loads the YAML via
   *  home_insights/get_automation, then shows the editor + feedback
   *  panel. Errors display inline in the modal. */
  private async _openRefineAutomationModal(
    automationId: string,
    alias: string,
  ): Promise<void> {
    if (!this.hass) return;
    this._refineAutomationModal = {
      automationId,
      alias,
      feedback: "",
      busy: true,
    };
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        yaml: string;
        config: Record<string, unknown>;
        alias: string | null;
        id: string | null;
      }>({
        type: "home_insights/get_automation",
        automation_id: automationId,
      });
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        originalYaml: result.yaml,
        busy: false,
      };
    } catch (err) {
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        busy: false,
        error: `Could not load automation: ${this._asMessage(err)}`,
      };
    }
  }

  private _toggleCohortExpansion(insightId: string): void {
    const next = new Set(this._expandedCohorts);
    if (next.has(insightId)) {
      next.delete(insightId);
    } else {
      next.add(insightId);
    }
    this._expandedCohorts = next;
  }

  private _closeRefineAutomationModal(): void {
    this._refineAutomationModal = undefined;
  }

  private async _submitRefineAutomation(): Promise<void> {
    if (!this.hass || !this._refineAutomationModal) return;
    const m = this._refineAutomationModal;
    if (!m.feedback.trim()) {
      this._refineAutomationModal = {
        ...m,
        error: "Add some feedback for the LLM (what should change?)",
      };
      return;
    }
    this._refineAutomationModal = { ...m, busy: true, error: undefined };
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        original_yaml: string;
        refined_yaml: string;
        refined_config: Record<string, unknown>;
        rationale: string | null;
        diff_summary: string[];
        bytes_sent: number;
        bytes_received: number;
      }>({
        type: "home_insights/refine_automation",
        automation_id: m.automationId,
        feedback: m.feedback,
      });
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        busy: false,
        originalYaml: result.original_yaml,
        refinedYaml: result.refined_yaml,
        refinedConfig: result.refined_config,
        rationale: result.rationale,
        diffSummary: result.diff_summary,
        bytesSent: result.bytes_sent,
        bytesReceived: result.bytes_received,
      };
    } catch (err) {
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        busy: false,
        error: `Refine failed: ${this._asMessage(err)}`,
      };
    }
  }

  private async _applyRefineAutomation(): Promise<void> {
    if (!this.hass || !this._refineAutomationModal) return;
    const m = this._refineAutomationModal;
    if (!m.refinedConfig) return;
    this._refineAutomationModal = { ...m, busy: true, error: undefined };
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/apply_automation_refinement",
        automation_id: m.automationId,
        refined_config: m.refinedConfig,
      });
      this._toast = `Applied refinement to '${m.alias}'`;
      this._refineAutomationModal = undefined;
    } catch (err) {
      this._refineAutomationModal = {
        ...this._refineAutomationModal!,
        busy: false,
        error: `Apply failed: ${this._asMessage(err)}`,
      };
    }
  }

  /** IDE-style line diff. Computes a longest-common-subsequence over
   *  both YAML inputs, then renders an aligned two-column view where:
   *    - unchanged lines appear on BOTH sides at the same row
   *    - removed-only lines appear on the left, blank on the right
   *    - added-only lines appear on the right, blank on the left
   *
   *  Each row has a gutter showing line number + change marker
   *  (-, +, or space). That's the standard pattern in VS Code,
   *  GitHub PR view, etc. — far more readable for YAML diffs than
   *  the previous "tint lines not found in the other side" approach
   *  because rows actually line up across panes. */
  private _renderSideBySideDiff(
    original: string,
    refined: string,
    leftLabel: string = "Current YAML",
    rightLabel: string = "Refined YAML",
  ): TemplateResult {
    const rows = this._alignDiffRows(
      original.split("\n"),
      refined.split("\n"),
    );

    type CellArgs = {
      lineNum: number | null;
      text: string | null;
      marker: " " | "+" | "-";
    };
    const cell = ({ lineNum, text, marker }: CellArgs, side: "L" | "R") => {
      const bg =
        marker === "-"
          ? "rgba(244, 67, 54, 0.10)"
          : marker === "+"
            ? "rgba(76, 175, 80, 0.12)"
            : "transparent";
      const color =
        marker === "-"
          ? "var(--error-color, #c62828)"
          : marker === "+"
            ? "var(--success-color, #2e7d32)"
            : "var(--primary-text-color)";
      // Inert empty cell — keeps row alignment when one side has no
      // content for this row.
      if (text === null) {
        return html`<div
          style="background:${bg}; min-height:1.2em; border-right: 1px solid var(--divider-color, rgba(0,0,0,0.06));"
        ></div>`;
      }
      return html`<div
        style="background:${bg}; color:${color}; white-space:pre; min-height:1.2em; display:flex; gap:6px; font-family: var(--code-font-family, monospace); border-right: 1px solid var(--divider-color, rgba(0,0,0,0.06)); padding: 0 6px;"
      ><span
          style="opacity:0.4; user-select:none; min-width:3ch; text-align:right;"
        >${lineNum ?? ""}</span><span
          style="opacity:0.55; user-select:none; width:1ch;"
        >${marker}</span><span>${text || " "}</span></div>`;
    };

    return html`<div
      style="margin-bottom: 8px;"
    >
      <div
        class="diff-header"
        style="display:grid; grid-template-columns: 1fr 1fr; gap: 0; font-weight: 500; font-size:0.88em; margin-bottom: 4px;"
      >
        <div style="border-bottom: 2px solid var(--error-color, #c62828); padding-bottom: 2px;">
          ${leftLabel}
        </div>
        <div style="border-bottom: 2px solid var(--success-color, #4caf50); padding-bottom: 2px; padding-left: 8px;">
          ${rightLabel}
        </div>
      </div>
      <div
        class="diff-pane"
        style="max-height:55vh; overflow:auto; font-size:0.82em; background: var(--code-background-color, rgba(0,0,0,0.03)); border-radius: 4px; border: 1px solid var(--divider-color, rgba(0,0,0,0.10));"
      >
        <div class="diff-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 0;">
          ${rows.map(
            (r) =>
              html`${cell(
                {
                  lineNum: r.leftLineNum,
                  text: r.leftText,
                  marker: r.leftMarker,
                },
                "L",
              )}${cell(
                {
                  lineNum: r.rightLineNum,
                  text: r.rightText,
                  marker: r.rightMarker,
                },
                "R",
              )}`,
          )}
        </div>
      </div>
    </div>`;
  }

  /** Compute aligned diff rows using LCS line matching. Returns an
   *  array where each row has both a left and right cell — empty
   *  on one side means the line was inserted/deleted there.
   *
   *  Algorithm: standard O(m*n) LCS table over line equality, then
   *  walk backwards to reconstruct the diff. For automation YAMLs
   *  (typically 20-200 lines) the dp table is tiny — milliseconds
   *  even on a Raspberry Pi. */
  private _alignDiffRows(
    a: string[],
    b: string[],
  ): Array<{
    leftLineNum: number | null;
    leftText: string | null;
    leftMarker: " " | "-";
    rightLineNum: number | null;
    rightText: string | null;
    rightMarker: " " | "+";
  }> {
    const m = a.length;
    const n = b.length;
    // dp[i][j] = LCS length of a[0..i) vs b[0..j)
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    // Walk back. Collect operations in reverse, then reverse at end.
    type Op = { type: "="; a: number; b: number } | { type: "-"; a: number } | { type: "+"; b: number };
    const ops: Op[] = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        ops.push({ type: "=", a: i - 1, b: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        ops.push({ type: "-", a: i - 1 });
        i--;
      } else {
        ops.push({ type: "+", b: j - 1 });
        j--;
      }
    }
    while (i > 0) {
      ops.push({ type: "-", a: i - 1 });
      i--;
    }
    while (j > 0) {
      ops.push({ type: "+", b: j - 1 });
      j--;
    }
    ops.reverse();

    // Convert flat ops into aligned rows. Consecutive `-` and `+`
    // ops get paired (one on each side); leftover ones get a blank
    // cell on the opposite side.
    const rows: ReturnType<typeof this._alignDiffRows> = [];
    let k = 0;
    while (k < ops.length) {
      const op = ops[k];
      if (op.type === "=") {
        rows.push({
          leftLineNum: op.a + 1,
          leftText: a[op.a],
          leftMarker: " ",
          rightLineNum: op.b + 1,
          rightText: b[op.b],
          rightMarker: " ",
        });
        k++;
        continue;
      }
      // Group a run of - and + ops, then pair them up
      const minus: number[] = [];
      const plus: number[] = [];
      while (k < ops.length && ops[k].type !== "=") {
        const o = ops[k];
        if (o.type === "-") minus.push(o.a);
        else plus.push(o.b);
        k++;
      }
      const max = Math.max(minus.length, plus.length);
      for (let p = 0; p < max; p++) {
        const lh = p < minus.length ? minus[p] : null;
        const rh = p < plus.length ? plus[p] : null;
        rows.push({
          leftLineNum: lh !== null ? lh + 1 : null,
          leftText: lh !== null ? a[lh] : null,
          leftMarker: lh !== null ? "-" : " ",
          rightLineNum: rh !== null ? rh + 1 : null,
          rightText: rh !== null ? b[rh] : null,
          rightMarker: rh !== null ? "+" : " ",
        });
      }
    }
    return rows;
  }

  /** Render a token-usage pill row under the rationale.
   *
   *  We get byte counts from the backend, not exact token counts —
   *  the HA Conversation API doesn't surface provider-side token
   *  metering, so we estimate via the standard ~4 chars/token rule
   *  used by both OpenAI and Anthropic tokenizer docs. Labelled
   *  "≈" to flag the approximation.
   *
   *  Returns nothing for the cached / deterministic-preview path
   *  (bytes_sent === 0 means we never made an LLM call).
   */
  private _renderTokenUsage(
    bytesSent?: number,
    bytesReceived?: number,
  ): TemplateResult | typeof nothing {
    if (!bytesSent && !bytesReceived) return nothing;
    const inTokens = Math.round((bytesSent ?? 0) / 4);
    const outTokens = Math.round((bytesReceived ?? 0) / 4);
    if (inTokens === 0 && outTokens === 0) return nothing;
    return html`<div
      style="margin: -6px 0 12px 0; font-size: 0.8em; color: var(--secondary-text-color);"
      title="Token counts are approximate (estimated from response byte length ÷ 4). HA's Conversation API doesn't expose provider-side token meters; bytes_sent/bytes_received are what we measure."
    >
      ≈ ${inTokens.toLocaleString()} in / ${outTokens.toLocaleString()} out tokens
      (${(bytesSent ?? 0).toLocaleString()}B sent · ${(bytesReceived ?? 0).toLocaleString()}B received)
    </div>`;
  }

  private _renderRefineAutomationModal(): TemplateResult | typeof nothing {
    const m = this._refineAutomationModal;
    if (!m) return nothing;
    return html`<div
      class="dialog-backdrop"
      @click=${this._closeRefineAutomationModal}
    >
      <div
        class="dialog dialog-wide"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <div class="dialog-header">
          <div class="dialog-title">
            ${m.refinedSource === "deterministic"
              ? html`📋 Preview deterministic fix for '${m.alias}'`
              : m.refinedSource === "stage-two"
                ? html`📋 + 🤖 Algorithm + LLM refine of '${m.alias}'`
                : html`✏️ Refine '${m.alias}' with AI`}
          </div>
          <button
            class="dialog-close"
            aria-label="Close"
            @click=${this._closeRefineAutomationModal}
          >×</button>
        </div>
        <div class="dialog-body">
          ${m.error
            ? html`<div
                class="error-banner"
                style="margin-bottom: 12px; border-radius: 6px;"
              >${m.error}</div>`
            : nothing}
          ${m.busy
            ? html`<div style="padding: 12px;">⏳ Working…</div>`
            : nothing}
          ${!m.refinedYaml && !m.busy
            ? html`
                <div style="margin-bottom: 8px; font-weight: 500;">
                  Current automation
                </div>
                ${m.originalYaml
                  ? html`<pre
                      style="max-height: 280px; overflow: auto; background: var(--code-background-color, rgba(0,0,0,0.04)); padding: 12px; border-radius: 4px; font-size: 0.85em;"
                    >${m.originalYaml}</pre>`
                  : html`<div
                      style="padding: 10px; margin-bottom: 8px; background: rgba(255, 152, 0, 0.10); border-left: 3px solid var(--warning-color, #ff9800); border-radius: 4px; font-size: 0.9em;"
                    >⚠️ Couldn't load the automation's YAML. HA's
                    automation registry returned an empty record for
                    this id. You can still describe a change below,
                    but the LLM won't have the existing YAML for
                    context — quality of the suggestion will be lower.</div>`}
                <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">
                  What should change?
                </div>
                <textarea
                  rows="4"
                  style="width: 100%; padding: 8px; box-sizing: border-box; font-family: inherit;"
                  placeholder="e.g. 'Move the trigger 10 minutes earlier' or 'Skip on weekends' or 'Add a notification when it fires'"
                  .value=${m.feedback}
                  @input=${(e: Event) => {
                    if (this._refineAutomationModal) {
                      this._refineAutomationModal = {
                        ...this._refineAutomationModal,
                        feedback: (e.target as HTMLTextAreaElement).value,
                      };
                    }
                  }}
                  ?disabled=${m.busy}
                ></textarea>
              `
            : nothing}
          ${m.refinedYaml
            ? html`
                ${m.rationale
                  ? html`<div
                      style="margin-bottom: 12px; padding: 10px; background: var(--info-background-color, rgba(33, 150, 243, 0.08)); border-left: 3px solid var(--info-color, #2196f3); border-radius: 4px;"
                    ><strong>Why these changes:</strong> ${m.rationale}</div>`
                  : nothing}
                ${this._renderTokenUsage(m.bytesSent, m.bytesReceived)}
                ${m.diffSummary && m.diffSummary.length > 0
                  ? html`<ul
                      style="margin: 0 0 12px 0; padding-left: 20px;"
                    >${m.diffSummary.map(
                      (line) => html`<li>${line}</li>`,
                    )}</ul>`
                  : nothing}
                ${this._renderSideBySideDiff(
                  m.originalYaml ?? "",
                  m.refinedYaml,
                  m.refinedSource === "stage-two"
                    ? "Algorithm Output (stage 1)"
                    : m.refinedSource === "deterministic"
                      ? "Current YAML (live)"
                      : "Current YAML",
                  m.refinedSource === "deterministic"
                    ? "Algorithm Fix (no LLM)"
                    : m.refinedSource === "stage-two"
                      ? "LLM Refinement (stage 2)"
                      : "Refined by LLM",
                )}
              `
            : nothing}
        </div>
        ${m.refinedYaml && m.auditInsightId
          ? html`<div
              style="border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1)); padding: 10px 16px; background: var(--secondary-background-color, rgba(0,0,0,0.02));"
              @click=${(e: Event) => e.stopPropagation()}
            >
              <div style="font-size: 0.85em; font-weight: 500; margin-bottom: 4px;">
                ${m.refinedSource === "deterministic"
                  ? "🤖 Take this further with the LLM?"
                  : "🤖 Refine again with more guidance?"}
              </div>
              <textarea
                rows="2"
                style="width: 100%; padding: 6px 8px; box-sizing: border-box; font-family: inherit; font-size: 0.88em;"
                placeholder=${m.refinedSource === "deterministic"
                  ? "Optional — describe any extra changes (e.g. 'also disable on holidays', 'add a notification')"
                  : "Optional follow-up feedback for another LLM pass…"}
                .value=${m.feedback}
                @input=${(e: Event) => {
                  if (this._refineAutomationModal) {
                    this._refineAutomationModal = {
                      ...this._refineAutomationModal,
                      feedback: (e.target as HTMLTextAreaElement).value,
                    };
                  }
                }}
                ?disabled=${m.busy}
              ></textarea>
              <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                <button
                  class="pill-action"
                  ?disabled=${m.busy}
                  @click=${this._refineFurtherWithLlm}
                  title="${m.refinedSource === 'deterministic'
                    ? 'Send the algorithm result + your extra feedback to the LLM for further refinement (uses tokens).'
                    : 'Send the current refined YAML + your follow-up back through the LLM.'}"
                >${m.busy
                  ? "Thinking…"
                  : m.refinedSource === "deterministic"
                    ? "🤖 Refine further with LLM"
                    : "🤖 Refine again"}</button>
              </div>
            </div>`
          : nothing}
        <div class="dialog-footer">
          ${!m.refinedYaml
            ? html`<button
                @click=${this._submitRefineAutomation}
                ?disabled=${m.busy || !m.feedback.trim()}
              >${m.busy ? "Refining…" : "Refine with AI"}</button>`
            : html`
                <button
                  @click=${() => {
                    if (this._refineAutomationModal) {
                      this._refineAutomationModal = {
                        ...this._refineAutomationModal,
                        refinedYaml: undefined,
                        refinedConfig: undefined,
                        rationale: undefined,
                        diffSummary: undefined,
                      };
                    }
                  }}
                  ?disabled=${m.busy}
                >Discard</button>
                <button
                  class="primary"
                  @click=${this._applyRefineAutomation}
                  ?disabled=${m.busy}
                  title=${m.refinedSource === "deterministic"
                    ? "Write the algorithm's deterministic fix to automations.yaml"
                    : m.refinedSource === "stage-two"
                      ? "Write the LLM's stage-2 refinement to automations.yaml"
                      : "Write this refined YAML to automations.yaml"}
                >${m.busy
                  ? "Applying…"
                  : m.refinedSource === "deterministic"
                    ? "Apply algorithm fix"
                    : m.refinedSource === "stage-two"
                      ? "Apply stage-2 result"
                      : "Apply refinement"}</button>
              `}
        </div>
      </div>
    </div>`;
  }

  /** Render insight.created_at as a relative-time pill ("3h ago" / "yesterday").
   *  Returns "" for very fresh (<5min) so we don't clutter brand-new rows. */
  private _formatAge(createdAt: string): string {
    if (!createdAt) return "";
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return "";
    const seconds = Math.floor((Date.now() - created) / 1000);
    if (seconds < 5 * 60) return "";
    if (seconds < 60 * 60) {
      const m = Math.floor(seconds / 60);
      return `${m}m ago`;
    }
    if (seconds < 24 * 60 * 60) {
      const h = Math.floor(seconds / 3600);
      return `${h}h ago`;
    }
    const days = Math.floor(seconds / (24 * 60 * 60));
    if (days === 1) return "yesterday";
    if (days < 14) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  /** Per-row trust indicator. Mirrors the header privacy mode but at row
   *  level so users have a constant reminder of what *any* LLM action on
   *  this row will do. Suppressed in OFF mode (no LLM = no trust concern).
   */
  /**
   * Maturity pill — shows BETA / EXPERIMENTAL when the insight comes
   * from a detector that hasn't been field-tested yet. STABLE insights
   * get no pill (no chrome for the default case). Sets honest
   * expectations so users know "this output might be wrong, please
   * tell us" vs "this should be reliable."
   *
   * Sources `insight.maturity` (field on the Insight dataclass, set
   * from the Detector class at scan time, surfaced via ws_list +
   * subscribe).
   */
  private _renderMaturityPill(
    insight: Insight,
  ): TemplateResult | typeof nothing {
    const maturity = (insight as unknown as { maturity?: string }).maturity;
    if (!maturity || maturity === "stable") return nothing;
    if (maturity === "beta") {
      return html`
        <span
          class="pill"
          style="background: rgba(255, 193, 7, 0.18); color: #b8860b;"
          title="BETA — this detector ships but hasn't been field-tested across diverse installs. Insights may have edge-case false positives. Dismiss feedback helps promote it to STABLE."
        >🟡 BETA</span>
      `;
    }
    if (maturity === "experimental") {
      return html`
        <span
          class="pill"
          style="background: rgba(156, 39, 176, 0.18); color: #6a1b9a;"
          title="EXPERIMENTAL — this detector is new. Output may be inaccurate or noisy. Was this useful? Dismiss or apply to teach the project what works."
        >🧪 EXPERIMENTAL</span>
      `;
    }
    return nothing;
  }

  private _renderTrustPill(): TemplateResult | typeof nothing {
    const mode = this._hello?.privacy_mode;
    if (!mode || mode === "off") return nothing;
    if (mode === "local") {
      return html`
        <span
          class="pill"
          style="background: rgba(76, 175, 80, 0.18); color: var(--success-color, #2e7d32);"
          title="LLM actions on this insight stay on your local network"
        >🟢 local</span>
      `;
    }
    return html`
      <span
        class="pill"
        style="background: rgba(255, 152, 0, 0.18); color: var(--warning-color, #e65100);"
        title="LLM actions on this insight send pseudonymized data to a cloud LLM"
      >🟡 cloud</span>
    `;
  }

  private _renderDiff(diff: string[]): TemplateResult {
    return html`
      <ul class="diff-list">
        ${diff.map((line) => {
          const cls = line.startsWith("+")
            ? "diff-add"
            : line.startsWith("-")
              ? "diff-remove"
              : "diff-change";
          return html`<li class=${cls}>${line}</li>`;
        })}
      </ul>
    `;
  }

  private _renderFeedbackInput(insight: Insight, label: string): TemplateResult {
    const feedback = this._feedbackById.get(insight.id) ?? "";
    return html`
      <div class="feedback">
        <h5>${label}</h5>
        <textarea
          placeholder="e.g. Add a sun.below_horizon condition; change debounce to 10s; only run when nobody is home"
          .value=${feedback}
          @input=${(e: Event) => {
            const value = (e.target as HTMLTextAreaElement).value;
            const next = new Map(this._feedbackById);
            if (value) next.set(insight.id, value);
            else next.delete(insight.id);
            this._feedbackById = next;
          }}
        ></textarea>
      </div>
    `;
  }

  private _renderRefinedPreview(insight: Insight, refined: RefinedState): TemplateResult {
    const busy = this._busyId === insight.id;
    return html`
      <div class="refined-banner">
        <strong>✨ Refined version proposed</strong>
        ${refined.rationale ?? "(no rationale provided)"}
        ${refined.diffSummary.length > 0
          ? this._renderDiff(refined.diffSummary)
          : html`<div style="margin-top: 6px; font-style: italic;">
              No top-level changes detected.
            </div>`}
      </div>
      <h4>Original vs refined</h4>
      <div class="compare">
        <div class="compare-col">
          <h5>Original</h5>
          <pre>${JSON.stringify(insight.payload, null, 2)}</pre>
        </div>
        <div class="compare-col refined">
          <h5>Refined</h5>
          <pre>${JSON.stringify(refined.payload, null, 2)}</pre>
        </div>
      </div>
      <h4>Edit refined before Apply</h4>
      ${this._renderPayloadView(insight, refined.payload)}
      ${this._renderPreview(insight)}
      ${this._renderRename(insight, refined)}
      ${this._renderFeedbackInput(insight, "Ask the LLM for further changes")}
      <div class="explain-row">
        <button
          class="action ${this._refineBusy ? "busy-pulse" : ""}"
          ?disabled=${this._refineBusy}
          @click=${() => this._refine(insight)}
        >
          ${this._refineBusy
            ? "💭 refining…"
            : `Refine again (turn ${(this._refineTurnsById.get(insight.id) ?? 0) + 1})`}
        </button>
        <button
          class="action"
          ?disabled=${this._testBusy}
          title="Fire the refined action(s) for real"
          @click=${() => this._testActions(insight, refined.payload)}
        >
          ${this._testBusy ? "testing…" : "🔥 Test refined"}
        </button>
        <button class="action" @click=${() => this._keepOriginal(insight.id)}>
          Keep original
        </button>
      </div>
      <div class="dialog-footer">
        <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
          Dismiss
        </button>
        <button
          class="action primary"
          ?disabled=${busy}
          @click=${() => this._apply(insight, refined.payload)}
        >
          ${busy ? "applying…" : "Apply refined"}
        </button>
      </div>
    `;
  }

  /**
   * v1.5.11 — Setup-guide dialog body for setup_quality insights.
   *
   * Why this exists separately from the generic dialog body: the
   * default body assumes the insight has YAML to refine/apply. It
   * shows a JSON payload editor, "Customize" rename form, "Notes
   * for the LLM" textarea, etc. setup_quality insights are
   * observational — they tell the user "wire X to unlock detector
   * Y". The actionable surface is a deep-link to the right HA
   * settings page, not a YAML editor.
   *
   * Handles BOTH:
   *   - summary insights (fingerprint.kind = "setup_quality_summary")
   *     payload contains `setup_steps` — a full per-feature roll-up.
   *   - per-feature insights (fingerprint.kind = "setup_quality_feature")
   *     payload contains single-feature shape — we synthesize a
   *     one-item list so the same renderer handles both.
   */
  private _renderSetupGuideBody(insight: Insight): TemplateResult {
    const busy = this._busyId === insight.id;
    const confidencePct = Math.round(insight.confidence * 100);
    const payload = (insight.payload ?? {}) as Record<string, unknown>;
    type Step = {
      feature?: string;
      feature_key?: string;
      tier?: string;
      advice?: string;
      next_step?: string;
      scenarios?: string[];
      setup_url?: string | null;
      setup_url_label?: string | null;
      setup_url_external?: boolean;
    };
    const steps: Step[] = Array.isArray(payload.setup_steps)
      ? (payload.setup_steps as Step[])
      : payload.feature_key
        ? [
            {
              feature: payload.feature as string | undefined,
              feature_key: payload.feature_key as string,
              tier: payload.tier as string | undefined,
              advice: (payload.advice as string | undefined) ?? "",
              next_step: (payload.next_step as string | undefined) ?? "",
              scenarios:
                (payload.scenarios_unlocked as string[] | undefined) ?? [],
              setup_url:
                (payload.setup_url as string | null | undefined) ?? null,
              setup_url_label:
                (payload.setup_url_label as string | null | undefined) ?? null,
              setup_url_external: !!payload.setup_url_external,
            },
          ]
        : [];
    const scorePct =
      typeof payload.score === "number"
        ? Math.round((payload.score as number) * 100)
        : null;
    return html`
      <div class="dialog-body setup-guide-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${scorePct !== null
            ? html`<span class="pill">${scorePct}% complete</span>`
            : nothing}
        </div>
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
        ${steps.length > 0
          ? html`
              <h4 style="margin-top:16px;">Features &amp; setup steps</h4>
              <div class="setup-steps">
                ${steps.map((s) => this._renderSetupStep(s))}
              </div>
            `
          : html`
              <div class="setup-stale-banner">
                <strong>This insight was created before v1.5.11.</strong>
                Re-scan to populate per-feature setup steps with deep-link
                buttons. Until then, the actions live inline in the
                explanation above.
                <div class="setup-stale-action">
                  <button
                    class="action primary"
                    ?disabled=${this._scanBusy}
                    @click=${this._runScanNow}
                    title="Refresh insights — regenerates this card with deep-link buttons for each setup step"
                  >
                    ${this._scanBusy ? "Scanning…" : "🔍 Run scan now"}
                  </button>
                </div>
              </div>
            `}
        <div class="subtitle" style="margin-top:12px;">
          After changing a setting, run Settings → Devices &amp; Services →
          HA Insights → <em>Scan now</em> to refresh setup completeness.
        </div>
      </div>
      <div class="dialog-footer">
        <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
          Dismiss
        </button>
        <button class="action" ?disabled=${busy} @click=${() => this._snooze(insight)}>
          Snooze 7d
        </button>
        <button
          class="action retire"
          ?disabled=${busy}
          title="Permanently retire this suggestion — won't appear again unless un-retired from the history view"
          @click=${() => this._retire(insight)}
        >
          Retire
        </button>
      </div>
    `;
  }

  /** v1.2.16 — Dedicated dialog body for automation_audit insights.
   *
   *  Pre-v1.2.16 audit insights shared the generic Refine-flow body,
   *  which:
   *    - Surfaced raw JSON payload front and center (the user has no
   *      use for the internal observation list shape).
   *    - Showed a Customize block (Alias / Description / "Notes for
   *      the LLM") that renames the *insight* — meaningless for an
   *      audit observation that already names an automation by alias.
   *    - Buried 🤖 Suggest improvements at the bottom and offered no
   *      direct link to the automation it was complaining about.
   *
   *  v1.2.16 renders observations as a structured list with per-kind
   *  icons + actions, promotes 🤖 Suggest as the primary CTA, and
   *  exposes a deeplink to /config/automation/edit/{automation_id}
   *  for the "fix it manually" path. Raw payload moves behind a
   *  <details> disclosure for power users. Apply ─ which is a no-op
   *  for an observation-only audit ─ is hidden entirely. */
  /** v1.12.8 — Specialized body renderer for v1.7+ detectors that
   *  use `payload_format="card"` but were previously falling through
   *  to the generic _renderPayloadView (raw JSON dump in the modal).
   *
   *  Dispatches on payload key (`_state_shift` / `_physical_device_link`
   *  / `_location_proposal`) to a per-type formatted body. New
   *  detectors that add a `_<name>` key to their payload should get a
   *  matching branch added here. Returns `nothing` when no
   *  specialized renderer matches — caller falls back to generic.
   *
   *  Why dispatch on payload key vs detector name: detector renaming
   *  shouldn't break the renderer, and the payload key is the
   *  contract the integration's CHANGELOG advertises (e.g. v1.11.0
   *  added "_physical_device_link" block).
   */
  private _hasSpecializedCardRenderer(insight: Insight): boolean {
    const payload = (insight.payload ?? {}) as Record<string, unknown>;
    return !!(
      payload._state_shift ||
      payload._physical_device_link ||
      payload._location_proposal
    );
  }

  private _renderCardBody(insight: Insight): TemplateResult | typeof nothing {
    const payload = (insight.payload ?? {}) as Record<string, unknown>;
    if (payload._state_shift) {
      return this._renderStateShiftBody(
        insight,
        payload._state_shift as Record<string, unknown>,
      );
    }
    if (payload._physical_device_link) {
      return this._renderPhysicalDeviceLinkBody(
        insight,
        payload._physical_device_link as Record<string, unknown>,
      );
    }
    if (payload._location_proposal) {
      return this._renderLocationProposalBody(
        insight,
        payload._location_proposal as Record<string, unknown>,
      );
    }
    return nothing;
  }

  /** v1.8.2 StateShiftDetector — "Daily-count for X shifted on YYYY-MM-DD." */
  private _renderStateShiftBody(
    insight: Insight,
    block: Record<string, unknown>,
  ): TemplateResult {
    const shiftDate = (block.shift_date as string) ?? "(unknown date)";
    const preMean = block.pre_shift_mean_per_day as number | undefined;
    const postMean = block.post_shift_mean_per_day as number | undefined;
    const daysAgo = block.days_ago as number | undefined;
    const magnitude = block.magnitude as number | undefined;
    const confidencePct = Math.round(insight.confidence * 100);
    return html`
      <div class="dialog-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">state shift</span>
          ${insight.maturity === "beta"
            ? html`<span class="pill" style="color: var(--warning-color)">🟡 BETA</span>`
            : nothing}
        </div>
        <h4>Routine shift detected</h4>
        <div class="state-shift-summary">
          <div class="state-shift-line">
            <span class="state-shift-label">Date:</span>
            <span class="state-shift-value">${shiftDate}${daysAgo != null ? html` (~${daysAgo} days ago)` : nothing}</span>
          </div>
          <div class="state-shift-line">
            <span class="state-shift-label">Before:</span>
            <span class="state-shift-value">${preMean != null ? html`~${preMean.toFixed(1)}/day` : "—"}</span>
          </div>
          <div class="state-shift-line">
            <span class="state-shift-label">After:</span>
            <span class="state-shift-value">${postMean != null ? html`~${postMean.toFixed(1)}/day` : "—"}</span>
          </div>
          ${magnitude != null
            ? html`<div class="state-shift-line">
                <span class="state-shift-label">Shift magnitude:</span>
                <span class="state-shift-value">${magnitude.toFixed(1)}</span>
              </div>`
            : nothing}
        </div>
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
      </div>
    `;
  }

  /** v1.11.0 PhysicalDeviceLinkDetector — "X and Y look like the same physical device." */
  private _renderPhysicalDeviceLinkBody(
    insight: Insight,
    block: Record<string, unknown>,
  ): TemplateResult {
    // v1.12.7 rename: entity_id / peer_entity_id (canonical sort).
    // Older insights stored entity_a / entity_b — handle both for
    // backward compat with cached insights from pre-v1.12.7 server.
    const entityId =
      (block.entity_id as string | undefined) ??
      (block.entity_a as string | undefined) ??
      "?";
    const peerEntityId =
      (block.peer_entity_id as string | undefined) ??
      (block.entity_b as string | undefined) ??
      "?";
    const r = block.pearson_r as number | undefined;
    const nSamples = block.n_aligned_samples as number | undefined;
    const bestLagBins = block.best_lag_bins as number | undefined;
    const deviceClass = (block.device_class as string) ?? "—";
    const lookbackDays = block.lookback_days as number | undefined;
    const confidencePct = Math.round(insight.confidence * 100);
    return html`
      <div class="dialog-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">device link</span>
          ${insight.maturity === "beta"
            ? html`<span class="pill" style="color: var(--warning-color)">🟡 BETA</span>`
            : nothing}
        </div>
        <h4>These look like the same physical device</h4>
        <div class="device-link-pair">
          <code class="device-link-eid">${entityId}</code>
          <span class="device-link-arrow">↔</span>
          <code class="device-link-eid">${peerEntityId}</code>
        </div>
        <div class="state-shift-summary">
          <div class="state-shift-line">
            <span class="state-shift-label">Pearson r:</span>
            <span class="state-shift-value">${r != null ? r.toFixed(3) : "—"}</span>
          </div>
          <div class="state-shift-line">
            <span class="state-shift-label">Aligned samples:</span>
            <span class="state-shift-value">${nSamples ?? "—"} (${lookbackDays ?? "?"}-day lookback)</span>
          </div>
          <div class="state-shift-line">
            <span class="state-shift-label">Device class:</span>
            <span class="state-shift-value">${deviceClass}</span>
          </div>
          ${bestLagBins != null && bestLagBins !== 0
            ? html`<div class="state-shift-line">
                <span class="state-shift-label">Detected at lag:</span>
                <span class="state-shift-value">${bestLagBins} bin${bestLagBins === 1 || bestLagBins === -1 ? "" : "s"} (likely clock drift between integrations)</span>
              </div>`
            : nothing}
        </div>
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
      </div>
    `;
  }

  /** v1.11.5 LocationProposalDetector — "X is probably in Living Room." */
  private _renderLocationProposalBody(
    insight: Insight,
    block: Record<string, unknown>,
  ): TemplateResult {
    const entityId = (block.entity_id as string) ?? "?";
    const areaName = (block.proposed_area_name as string) ?? "?";
    const medianR = block.median_r as number | undefined;
    const nSiblings = block.n_siblings as number | undefined;
    const deviceClass = (block.device_class as string) ?? "—";
    const alternatives = (block.alternatives as Array<{
      area_id?: string;
      median_r?: number;
      n_siblings?: number;
    }>) ?? [];
    const confidencePct = Math.round(insight.confidence * 100);
    const strength =
      medianR != null && medianR >= 0.9 ? "Almost certainly" : "Probably";
    return html`
      <div class="dialog-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">location proposal</span>
          ${insight.maturity === "beta"
            ? html`<span class="pill" style="color: var(--warning-color)">🟡 BETA</span>`
            : nothing}
        </div>
        <h4>${strength} in ${areaName}</h4>
        <div class="location-proposal-summary">
          <div>
            <code>${entityId}</code> matches
            ${nSiblings ?? "?"} tagged ${deviceClass}
            ${nSiblings === 1 ? "sibling" : "siblings"} at median
            r=${medianR != null ? medianR.toFixed(2) : "?"}.
          </div>
        </div>
        ${alternatives.length > 0
          ? html`
              <h4>Alternative areas considered</h4>
              <ul class="location-alt-list">
                ${alternatives.map(
                  (alt) => html`
                    <li>
                      <code>${alt.area_id ?? "?"}</code> —
                      r=${alt.median_r != null ? alt.median_r.toFixed(2) : "?"}
                      across ${alt.n_siblings ?? "?"} sibling${alt.n_siblings === 1 ? "" : "s"}
                    </li>
                  `,
                )}
              </ul>
            `
          : nothing}
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
        <p class="location-proposal-note">
          <strong>Advisory only.</strong> This detector never auto-assigns areas.
          Confirm the suggestion via the bulk-area-assign dialog or override
          with a different area.
        </p>
      </div>
    `;
  }

  private _renderAuditBody(insight: Insight): TemplateResult {
    const busy = this._busyId === insight.id || this._auditSuggestBusy === insight.id;
    const confidencePct = Math.round(insight.confidence * 100);
    const payload = (insight.payload ?? {}) as Record<string, unknown>;
    const automationAlias = (payload.automation_alias as string | undefined) ?? "";
    const automationId = (payload.automation_id as string | undefined) ?? "";
    const advice = (payload.advice as string | undefined) ?? "";
    type Observation = {
      kind: string;
      text: string;
      confidence?: number;
      metrics?: Record<string, unknown>;
    };
    const observations: Observation[] = Array.isArray(payload.observations)
      ? (payload.observations as Observation[]).filter(
          (o): o is Observation => typeof o === "object" && o !== null,
        )
      : [];
    const targetEntities = Array.isArray(payload.target_entities)
      ? (payload.target_entities as unknown[]).filter(
          (e): e is string => typeof e === "string",
        )
      : [];
    const triggerEntities = Array.isArray(payload.trigger_entities)
      ? (payload.trigger_entities as unknown[]).filter(
          (e): e is string => typeof e === "string",
        )
      : [];
    const relatedIds = Array.isArray(payload.related_insight_ids)
      ? (payload.related_insight_ids as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : [];
    // entity_ids the audit has flagged as missing/silent so we can
    // mark them on the entity-pill list. Dedup'd Set lookup keeps
    // the per-pill check O(1).
    const silentEntities = new Set<string>();
    for (const o of observations) {
      if (
        o.kind === "entity_silent"
        && o.metrics
        && typeof o.metrics.entity_id === "string"
      ) {
        silentEntities.add(o.metrics.entity_id);
      }
    }
    const editorUrl = automationId
      ? `/config/automation/edit/${automationId}`
      : "";
    return html`
      <div class="dialog-body audit-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">automation_audit</span>
          ${insight.maturity === "beta"
            ? html`<span class="pill" style="color: var(--warning-color)">🟡 BETA</span>`
            : nothing}
        </div>
        ${automationAlias
          ? html`
              <div class="audit-automation-header">
                <div class="audit-automation-name">${automationAlias}</div>
                ${editorUrl
                  ? html`<a
                      class="action primary"
                      href=${editorUrl}
                      target="_top"
                      title="Jump straight to this automation in HA's editor — fix it manually here"
                    >Open in editor →</a>`
                  : nothing}
              </div>
            `
          : nothing}
        ${advice
          ? html`<div class="audit-advice">${advice}</div>`
          : nothing}
        ${observations.length > 0
          ? html`
              <h4 style="margin: 16px 0 4px 0;">
                Findings (${observations.length})
              </h4>
              <ul class="audit-findings">
                ${observations.map((o) => this._renderAuditFinding(o))}
              </ul>
            `
          : nothing}
        ${triggerEntities.length > 0 || targetEntities.length > 0
          ? html`
              <h4 style="margin: 16px 0 4px 0;">Entities</h4>
              <div class="audit-entity-grid">
                ${triggerEntities.length > 0
                  ? html`
                      <div>
                        <div class="audit-entity-label">Trigger</div>
                        <div class="audit-entity-pills">
                          ${triggerEntities.map(
                            (e) => this._renderAuditEntityPill(e, silentEntities.has(e)),
                          )}
                        </div>
                      </div>
                    `
                  : nothing}
                ${targetEntities.length > 0
                  ? html`
                      <div>
                        <div class="audit-entity-label">Target</div>
                        <div class="audit-entity-pills">
                          ${targetEntities.map(
                            (e) => this._renderAuditEntityPill(e, silentEntities.has(e)),
                          )}
                        </div>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${relatedIds.length > 0
          ? html`
              <h4 style="margin: 16px 0 4px 0;">
                Related insights (${relatedIds.length})
              </h4>
              <div class="audit-related">
                ${relatedIds.map((id) => {
                  const related = this._insights.find((i) => i.id === id);
                  const label = related
                    ? this._displayTitle(related)
                    : `<${id.slice(0, 12)}…>`;
                  return html`
                    <a
                      class="audit-related-link"
                      href="#"
                      @click=${(e: Event) => {
                        e.preventDefault();
                        if (related) this._openDialog(related.id);
                      }}
                    >${label}</a>
                  `;
                })}
              </div>
            `
          : nothing}
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
        <details class="audit-raw-payload">
          <summary>Show raw payload</summary>
          <pre class="payload-code">${JSON.stringify(insight.payload, null, 2)}</pre>
        </details>
      </div>
      <div class="dialog-footer">
        <button
          class="action primary"
          ?disabled=${busy}
          @click=${() => this._runAuditSuggest(insight)}
          title="Ask the LLM for specific YAML edits to fix these findings"
        >${this._auditSuggestBusy === insight.id
          ? "Thinking…"
          : "🤖 Suggest improvements"}</button>
        <button
          class="action"
          ?disabled=${busy}
          @click=${() => this._dismiss(insight)}
        >Dismiss</button>
        <button
          class="action"
          ?disabled=${busy}
          @click=${() => this._snooze(insight)}
        >Snooze 7d</button>
        <button
          class="action retire"
          ?disabled=${busy}
          title="Permanently retire this suggestion — won't appear again unless un-retired from the history view"
          @click=${() => this._retire(insight)}
        >Retire</button>
      </div>
    `;
  }

  /** One audit observation row. Kind-aware icon + a context action
   *  (entity link / scroll to editor / linked insight) so the user
   *  can act on each finding without leaving the dialog. */
  private _renderAuditFinding(o: {
    kind: string;
    text: string;
    metrics?: Record<string, unknown>;
  }): TemplateResult {
    const kindIcons: Record<string, string> = {
      entity_silent: "🔴",
      redundant_target: "🔁",
      long_on_duration: "⏱️",
      trigger_time_drift: "🕒",
      trace_dormant: "💤",
      trace_condition_blocks: "🚧",
      trace_action_errors: "❗",
      has_recent_insights: "📌",
      rollup_dow: "📅",
      rollup_dom: "📆",
      rollup_month: "🗓️",
      entity_stale_state: "🥶",
      cross_integration_coupling: "🌩️",
    };
    const icon = kindIcons[o.kind] ?? "•";
    const eid = typeof o.metrics?.entity_id === "string" ? o.metrics.entity_id as string : "";
    // Per-kind context action — small inline link so the user can act
    // on this specific finding without leaving the dialog.
    let action: TemplateResult | typeof nothing = nothing;
    if (o.kind === "entity_silent" && eid) {
      const url = `/config/entities?config_entry=&domain=&q=${encodeURIComponent(eid)}`;
      action = html`
        <a
          class="audit-finding-action"
          href=${url}
          target="_top"
          title="Open Entity Registry filtered to '${eid}' so you can rename, remove, or replace it"
        >Open entity →</a>
      `;
    }
    return html`
      <li class="audit-finding audit-finding--${o.kind}">
        <span class="audit-finding-icon">${icon}</span>
        <span class="audit-finding-text">${o.text}</span>
        ${action}
      </li>
    `;
  }

  /** Compact pill for an entity_id under Trigger / Target. The silent
   *  flag adds a red dot so the user spots the offending entity at a
   *  glance without scanning the findings list. */
  private _renderAuditEntityPill(eid: string, silent: boolean): TemplateResult {
    return html`
      <span class="audit-entity-pill ${silent ? "is-silent" : ""}">
        ${silent ? html`<span class="silent-dot" title="Flagged silent / missing">●</span> ` : nothing}
        ${eid}
      </span>
    `;
  }

  private _renderSetupStep(step: {
    feature?: string;
    feature_key?: string;
    tier?: string;
    advice?: string;
    next_step?: string;
    scenarios?: string[];
    setup_url?: string | null;
    setup_url_label?: string | null;
    setup_url_external?: boolean;
    signals?: string[];
  }): TemplateResult {
    const tier = step.tier ?? "USELESS";
    const tierBadge =
      (
        {
          GREAT: { emoji: "✅", label: "Working great", cls: "ok" },
          GOOD: { emoji: "🟢", label: "Working", cls: "ok" },
          LIMITED: { emoji: "🟠", label: "Partial", cls: "warn" },
          USELESS: { emoji: "🔴", label: "Not configured", cls: "todo" },
        } as Record<string, { emoji: string; label: string; cls: string }>
      )[tier] ?? { emoji: "⚪", label: tier, cls: "" };
    const scenarios = Array.isArray(step.scenarios) ? step.scenarios : [];
    const showScenarios = tier !== "GREAT" && scenarios.length > 0;
    const signals = Array.isArray(step.signals) ? step.signals : [];
    const hasUrl = !!step.setup_url;
    const external = !!step.setup_url_external;
    // v1.2.15: setup URL is shown at every tier — including GREAT —
    // so users can verify or revisit the underlying config (Companion
    // App page, /config/devices etc). Pre-v1.2.15 the link was hidden
    // when tier === "GREAT", leaving the user with "Working great" and
    // no way to inspect WHAT was working. Same URL, different
    // call-to-action verb per tier.
    const linkVerb = tier === "GREAT" ? "Manage" : (step.setup_url_label ?? "Set this up");
    return html`
      <div class="setup-step setup-step--${tierBadge.cls}">
        <div class="setup-step-header">
          <span class="setup-step-tier">
            ${tierBadge.emoji} ${tierBadge.label}
          </span>
          <span class="setup-step-name">${step.feature ?? ""}</span>
        </div>
        ${step.advice
          ? html`<div class="setup-step-advice">${step.advice}</div>`
          : nothing}
        ${signals.length > 0
          ? html`
              <details class="setup-step-signals" ?open=${tier === "GREAT"}>
                <summary>Detected signals (${signals.length})</summary>
                <ul>
                  ${signals.map((s) => html`<li>${s}</li>`)}
                </ul>
              </details>
            `
          : nothing}
        ${showScenarios
          ? html`
              <details class="setup-step-scenarios">
                <summary>What this unlocks</summary>
                <ul>
                  ${scenarios.map((s) => html`<li>${s}</li>`)}
                </ul>
              </details>
            `
          : nothing}
        ${hasUrl
          ? external
            ? html`
                <div class="setup-step-action">
                  <a
                    class="action ${tier === "GREAT" ? "" : "primary"}"
                    href=${step.setup_url as string}
                    target="_blank"
                    rel="noopener"
                  >${linkVerb} ↗</a>
                </div>
              `
            : html`
                <div class="setup-step-action">
                  <a
                    class="action ${tier === "GREAT" ? "" : "primary"}"
                    href=${step.setup_url as string}
                  >${linkVerb} →</a>
                </div>
              `
          : tier !== "GREAT" && step.next_step
            ? html`<div class="setup-step-note">${step.next_step}</div>`
            : nothing}
        ${tier !== "GREAT" && step.feature_key === "presence_inference"
          ? html`
              <div class="setup-step-action">
                <button
                  class="action"
                  title="Open a bulk area-assignment dialog inside HA Insights — no leaving the panel"
                  @click=${() => {
                    this._bulkAreaAssignOpen = true;
                  }}
                >📍 Bulk assign in HA Insights</button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderDialog(): TemplateResult | typeof nothing {
    if (!this._dialogId) return nothing;
    const insight = this._insights.find((i) => i.id === this._dialogId);
    if (!insight) return nothing;
    const busy = this._busyId === insight.id;
    const llmEnabled = this._hello?.privacy_mode && this._hello.privacy_mode !== "off";
    const ttsConfigured = Boolean(this._config.tts_target_entity_id);
    const confidencePct = Math.round(insight.confidence * 100);
    const refined = this._refinedById.get(insight.id);
    return html`
      <div class="dialog-backdrop" @click=${this._closeDialog}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <div class="dialog-title">
              ${this._displayTitle(insight)}
              ${this._renderCouplingBadge(insight)}
              ${this._renderDirectionalityBadge(insight)}
              ${this._renderEntityAgeBadge(insight)}
            </div>
            <button
              class="dialog-close"
              aria-label="Close"
              @click=${this._closeDialog}
            >×</button>
          </div>
          ${refined
            ? html`<div class="dialog-body">
                ${this._renderModalError()}
                ${this._renderTestResults()}
                ${this._renderRefinedPreview(insight, refined)}
              </div>`
            : insight.detector === "setup_quality"
              ? this._renderSetupGuideBody(insight)
              : insight.detector === "automation_audit"
                && insight.payload_format !== "automation"
                ? this._renderAuditBody(insight)
                : this._hasSpecializedCardRenderer(insight)
                  ? this._renderCardBody(insight)
                  : html`
                <div class="dialog-body">
                  ${this._renderModalError()}
                  ${this._renderTestResults()}
                  <div class="row-meta">
                    <span class="pill">confidence ${confidencePct}%</span>
                    <span class="pill">${insight.detector}</span>
                    ${insight.area_id ? html`<span class="pill">${insight.area_id}</span>` : nothing}
                    ${insight.conflicts_with.length > 0
                      ? html`<span class="pill" style="color: var(--warning-color)">conflicts</span>`
                      : nothing}
                  </div>
                  <h4>${this._payloadHeading(insight.payload_format)}</h4>
                  ${this._renderPayloadView(insight)}
                  ${insight.explanation
                    ? html`<div class="explanation">${insight.explanation}</div>`
                    : nothing}
                  ${this._hypothesisById.has(insight.id)
                    ? html`<div class="explanation hypothesis">
                        <strong>Likely causes:</strong>
                        ${this._hypothesisById.get(insight.id)}
                      </div>`
                    : nothing}
                  ${this._renderManagedDevicesSection(insight)}
                  ${this._renderPreview(insight)}
                  ${this._renderRename(insight, undefined)}
                  ${llmEnabled
                    ? this._renderFeedbackInput(
                        insight,
                        "Notes for the LLM (optional, used by Refine)",
                      )
                    : nothing}
                  <div class="explain-row">
                    ${llmEnabled && !insight.explanation
                      ? html`
                          <button
                            class="action ${this._explainBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._explainBusy}
                            @click=${() => this._explain(insight)}
                          >
                            ${this._explainBusy ? "💭 thinking…" : "Explain with LLM"}
                          </button>
                        `
                      : nothing}
                    ${llmEnabled && insight.payload_format === "automation"
                      ? html`
                          <button
                            class="action ${this._refineBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._refineBusy}
                            title="${this._refineConversationById.has(insight.id)
                              ? "Continue the LLM conversation with new feedback"
                              : "Ask the LLM to refine this automation"}"
                            @click=${() => this._refine(insight)}
                          >
                            ${this._refineBusy
                              ? "💭 refining…"
                              : this._refineConversationById.has(insight.id)
                                ? `✨ Refine again (turn ${(this._refineTurnsById.get(insight.id) ?? 0) + 1})`
                                : "✨ Refine with LLM"}
                          </button>
                          ${this._refineConversationById.has(insight.id)
                            ? html`<button
                                class="action"
                                title="Forget the prior conversation and start a fresh refine thread"
                                @click=${() => {
                                  this._resetRefineConversation(insight.id);
                                  this._toast = "Refine conversation reset";
                                }}
                              >
                                🔁 Reset conversation
                              </button>`
                            : nothing}
                        `
                      : nothing}
                    ${llmEnabled
                      ? html`
                          <button
                            class="action"
                            ?disabled=${this._previewBusy}
                            title="Preview the exact data that would be sent to the LLM"
                            @click=${() => this._previewRedaction(insight)}
                          >
                            ${this._previewBusy
                              ? "loading…"
                              : this._previewById.has(insight.id)
                                ? "🛡️ Hide preview"
                                : "🛡️ What gets sent?"}
                          </button>
                        `
                      : nothing}
                    ${llmEnabled && insight.kind === "anomaly"
                      ? html`
                          <button
                            class="action ${this._hypothesizeBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._hypothesizeBusy}
                            title="Ask the LLM for plausible causes of this anomaly"
                            @click=${() => this._hypothesize(insight)}
                          >
                            ${this._hypothesizeBusy
                              ? "💭 thinking…"
                              : this._hypothesisById.has(insight.id)
                                ? "🔍 Re-hypothesize"
                                : "🔍 Get hypothesis"}
                          </button>
                        `
                      : nothing}
                    ${ttsConfigured && insight.explanation
                      ? html`
                          <button
                            class="action"
                            ?disabled=${this._ttsBusy}
                            title="Read aloud on ${this._config.tts_target_entity_id}"
                            @click=${() => this._readAloud(insight)}
                          >
                            ${this._ttsBusy ? "speaking…" : "🔊 Read aloud"}
                          </button>
                        `
                      : nothing}
                    ${insight.payload_format === "automation"
                      ? html`<button
                          class="action"
                          ?disabled=${this._testBusy}
                          title="Fire the action(s) for real"
                          @click=${() => this._testActions(insight)}
                        >
                          ${this._testBusy ? "testing…" : "🔥 Test actions"}
                        </button>`
                      : nothing}
                    ${this._primaryEntityId(insight) !== null
                      ? html`<button
                          class="action"
                          title="Find My iPhone style: opens a modal that fires the entity's native identifier (light flash / chime / fan flicker) every 5 seconds until you click 'Found it!'. Multi-entity insights show every referenced entity as a checkbox so you can identify them one at a time."
                          @click=${() => this._identifyEntity(insight)}
                        >
                          🔆 Identify entity
                        </button>
                        <button
                          class="action"
                          title="Live RSSI from the entity's BLE advertisements. Walk around with your phone — the trend arrow tells you whether you're getting closer or further. EXPERIMENTAL — requires the entity to be BLE-trackable (companion app or a BLE proxy)."
                          @click=${() => this._openBleFindForInsight(insight)}
                        >
                          📡 BLE find
                        </button>`
                      : nothing}
                  </div>
                  ${!llmEnabled
                    ? html`<div class="subtitle" style="margin-top: 12px;">
                        LLM Explain / Refine disabled — enable Local or Cloud mode in
                        Settings → Devices & Services.
                      </div>`
                    : nothing}
                </div>
                <div class="dialog-footer">
                  <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
                    Dismiss
                  </button>
                  ${insight.applied_at
                    ? nothing
                    : html`<button
                        class="action"
                        ?disabled=${busy}
                        @click=${() => this._snooze(insight)}
                      >
                        Snooze 7d
                      </button>`}
                  ${insight.applied_at || insight.retired_at
                    ? nothing
                    : html`<button
                        class="action retire"
                        ?disabled=${busy}
                        title="Permanently retire this suggestion — won't appear again unless un-retired from the history view"
                        @click=${() => this._retire(insight)}
                      >
                        Retire
                      </button>`}
                  ${insight.retired_at
                    ? html`<button
                        class="action"
                        ?disabled=${busy}
                        title="Reverse the retire decision — this insight goes back into the active queue"
                        @click=${() => this._unretire(insight)}
                      >
                        ↺ Un-retire
                      </button>`
                    : nothing}
                  ${insight.applied_at
                    ? html`<button
                        class="action primary"
                        ?disabled=${busy}
                        title="Remove the automation and revert this insight to active"
                        @click=${() => this._undo(insight)}
                      >
                        ${busy ? "undoing…" : "↶ Undo apply"}
                      </button>`
                    : insight.payload_format === "automation"
                      ? html`<button
                          class="action primary"
                          ?disabled=${busy}
                          @click=${() => this._apply(insight)}
                        >
                          ${busy ? "applying…" : "Apply"}
                        </button>`
                      : nothing}
                </div>
              `}
        </div>
      </div>
    `;
  }

  private _renderErrorBanner(): TemplateResult | typeof nothing {
    if (!this._error) return nothing;
    return html`
      <div class="error-banner">
        <span>${this._error}</span>
        <button @click=${() => (this._error = undefined)}>Dismiss</button>
      </div>
    `;
  }

  protected render(): TemplateResult {
    // v1.2.9: no "Loading…" curtain. The card renders based on data
    // it actually has — insights (the real payload), _hello (server
    // contact), _error (visible failure), _scanInProgress (transient).
    // Empty data + no contact yet = the normal empty state below
    // with a Refresh CTA, NOT a stuck "Loading…" screen.
    //
    // Scan-in-progress curtain. Hides the live-mutating subscribe stream
    // until the canonical post-scan ws_list lands via _refreshFromEvent.
    // Header stays visible so the user has context + can still click the
    // Stop button or other controls.
    if (this._scanInProgress) {
      return html`
        <ha-card>
          ${this._renderHeader()}
          <div class="empty empty-scanning">
            <div class="spinner" aria-hidden="true"></div>
            <div>Scanning…</div>
            <div class="empty-sub">
              Running detectors. Results appear when the scan finishes.
            </div>
          </div>
        </ha-card>
      `;
    }
    const rows = this._filtered();
    if (this._config.compact) {
      return html`
        <ha-card>
          ${this._renderSkewBanner()}
          ${this._renderErrorBanner()}
          ${this._renderCompactTile(rows)}
        </ha-card>
      `;
    }
    return html`
      <ha-card>
        ${this._renderHeader()}
        ${this._renderSkewBanner()}
        ${this._renderErrorBanner()}
        ${this._toast ? html`<div class="toast">${this._toast}</div>` : nothing}
        ${rows.length === 0
          ? html`<div class="empty">
              <div>Watching your home. New insights appear here as patterns emerge.</div>
              <div class="empty-actions">
                <button
                  ?disabled=${this._scanBusy}
                  @click=${this._runScanNow}
                  title="Run all detectors against the current state buffer"
                >
                  ${this._scanBusy ? "Scanning…" : "🔍 Run scan now"}
                </button>
                <a
                  href="https://github.com/botts7/ha-insights"
                  target="_blank"
                  rel="noopener"
                  title="Open the project README"
                >
                  How it works ↗
                </a>
              </div>
            </div>`
          : this._grouped(rows).flatMap(([key, items]) =>
              key
                ? [
                    html`<div class="group-header">${key} (${items.length})</div>`,
                    ...items.map((i) => this._renderRow(i)),
                  ]
                : items.map((i) => this._renderRow(i)),
            )}
        ${this._renderTruncationFooter(rows.length)}
      </ha-card>
      ${this._renderDialog()}
      ${this._renderBleFindModal()}
      ${this._renderIdentifyModal()}
      ${this._renderRefineAutomationModal()}
      ${this._renderSuggestAddDialog()}
      <bulk-area-assign-dialog
        .hass=${this.hass as unknown as HassLite}
        ?open=${this._bulkAreaAssignOpen}
        @closed=${() => {
          this._bulkAreaAssignOpen = false;
        }}
        @assignments-saved=${(e: CustomEvent) => {
          const detail = e.detail as { saved: number; failed: number };
          this._toast = `Areas saved: ${detail.saved}${
            detail.failed ? ` (${detail.failed} failed)` : ""
          }`;
        }}
      ></bulk-area-assign-dialog>
    `;
  }

  /** v1.2.3 — Footer that says "Showing N of M — +X more → View all".
   *  Only appears when the dashboard tile is sized to show fewer rows
   *  than the user actually has. Without it the tile shows 1 insight
   *  with no hint that 25 more are queued behind "View all" in the
   *  header. */
  private _renderTruncationFooter(
    rendered: number,
  ): TemplateResult | typeof nothing {
    const total = this._totalFilteredCount;
    if (total <= rendered) return nothing;
    const hidden = total - rendered;
    return html`
      <a class="truncation-footer" href="/ha-insights" title="Open the full HA Insights panel">
        Showing ${rendered} of ${total} — +${hidden} more →
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-card": HaInsightsCard;
  }
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description?: string;
    }>;
  }
}

// Guard against double-registration: ha-insights-card.js and
// ha-insights-panel.js both ship this class (panel imports card to
// embed it). When the user has the card resource loaded AND the
// integration auto-registers the panel JS, both bundles try to
// define("ha-insights-card") and the second throws. The .get() check
// makes the second load a no-op.
if (!customElements.get("ha-insights-card")) {
  customElements.define("ha-insights-card", HaInsightsCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-insights-card")) {
  window.customCards.push({
    type: "ha-insights-card",
    name: "HA Insights Card",
    description: "Shows insights from the HA Insights integration",
  });
}
