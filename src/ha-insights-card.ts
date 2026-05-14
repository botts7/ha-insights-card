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
  @state() private _ttsBusy = false;
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
      font-size: 1.1em;
      font-weight: 500;
    }
    .subtitle {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .header a.view-all {
      flex-shrink: 0;
      font-size: 0.85em;
      color: var(--primary-color);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 120ms;
    }
    .header a.view-all:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
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
    .row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
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
    .explanation {
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid var(--primary-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      font-style: italic;
      line-height: 1.5;
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
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._updateAutoMaxRows(entry.contentRect.height);
      }
    });
    this._resizeObserver.observe(this);
    // v1.2.9: visibility-resume handler removed. HA's WS library
    // auto-reconnects + auto-resubscribes on backgrounding. With the
    // _loading flag gone (also v1.2.9), there's no stuck state for
    // tab-return to recover from. The subscription naturally delivers
    // any events that fired during the pause when it resumes.
  }

  private _scanStarted = (): void => {
    this._scanInProgress = true;
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
    // v1.2.8: every WS call gets a timeout. If the call hangs (post-
    // tab-resume, WS-reconnect-in-flight, slow integration startup),
    // we surface a real error after 8s instead of sitting on
    // "Loading…" forever.
    // v1.2.9: no _loading flag to clear. Failures set _error which
    // render() shows as a banner; subsequent retries clear _error
    // on success. The card always renders SOMETHING useful — never
    // a stuck curtain.
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
        }),
        "home_insights/list",
      );
      this._insights = result.insights ?? [];
      this._error = undefined; // success clears any prior error
    } catch (err) {
      this._error = `Could not list insights: ${this._asMessage(err)}`;
      return;
    }

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
    const view = basePayload ?? insight.payload;
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
      );

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
    const sub = this._hello
      ? `v${this._hello.integration_version} · protocol ${this._hello.ws_protocol_version}`
      : "connecting…";
    return html`
      <div class="header">
        <div class="titles">
          <div class="title">
            ${title} ${this._renderModeBadge(this._hello?.privacy_mode)}
          </div>
          <div class="subtitle">${sub}</div>
        </div>
        <a
          class="view-all"
          href="/ha-insights"
          title="Open the full HA Insights panel"
        >View all →</a>
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
          ${insight.title}
          ${hasCohort
            ? html` <button
                class="pill-action"
                style="margin-left:6px;"
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
        <div class="row-meta">
          <span class="pill ${confidenceClass}">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${insight.area_id
            ? html`<span class="pill">${insight.area_name ?? insight.area_id}</span>`
            : nothing}
          ${insight.integration
            ? html`<span
                class="pill"
                style="color: var(--secondary-text-color); background: rgba(76, 110, 245, 0.10);"
                title="Source integration for this entity. Useful context when deciding whether the schedule lives in HA (here) or in the vendor app (look for 🏷️ pill)."
              >🔌 ${insight.integration}</span>`
            : nothing}
          ${this._renderTrustPill()}
          ${this._renderMaturityPill(insight)}
          ${ageLabel
            ? html`<span class="pill" title=${insight.created_at}>${ageLabel}</span>`
            : nothing}
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
          ${insight.external_source
            ? html`<span
                class="pill"
                style="color: var(--secondary-text-color); background: rgba(33, 150, 243, 0.10);"
                title="HA noticed this pattern but the schedule is managed in the vendor app (${insight.external_source}) — not in HA. Creating a new HA automation likely won't help."
              >🏷️ managed externally (${insight.external_source})</span>`
            : nothing}
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
        </div>
      </div>
    `;
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
      </div>
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
    const hasUrl = !!step.setup_url;
    const external = !!step.setup_url_external;
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
        ${tier !== "GREAT" && hasUrl
          ? external
            ? html`
                <div class="setup-step-action">
                  <a
                    class="action primary"
                    href=${step.setup_url as string}
                    target="_blank"
                    rel="noopener"
                  >${step.setup_url_label ?? "Set this up"} ↗</a>
                </div>
              `
            : html`
                <div class="setup-step-action">
                  <a
                    class="action primary"
                    href=${step.setup_url as string}
                  >${step.setup_url_label ?? "Set this up"} →</a>
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
            <div class="dialog-title">${insight.title}</div>
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
      ${this._renderRefineAutomationModal()}
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
