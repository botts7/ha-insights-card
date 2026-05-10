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
  @state() private _loading = true;
  @state() private _busyId?: string;
  @state() private _toast?: string;
  @state() private _dialogId?: string;
  @state() private _explainBusy = false;
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
  /**
   * v0.5: rows that fit in the card's currently-rendered height. Updated
   * by ResizeObserver. Used as the row cap when the user hasn't set
   * max_rows explicitly. -1 means "not yet measured; use the default."
   */
  @state() private _autoMaxRows = -1;

  private _unsub?: () => void;
  private _toastTimer?: number;
  private _wired = false;
  private _resizeObserver?: ResizeObserver;
  private _keydownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this._dialogId) {
      this._closeDialog();
    }
  };

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
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._updateAutoMaxRows(entry.contentRect.height);
      }
    });
    this._resizeObserver.observe(this);
  }

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
    if (changedProps.has("hass") && this.hass && !this._wired) {
      this._wired = true;
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
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._keydownHandler);
    document.body.style.overflow = "";
    this._unsub?.();
    this._unsub = undefined;
    this._wired = false;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  private async _wire(): Promise<void> {
    if (!this.hass) return;
    try {
      this._hello = await this.hass.connection.sendMessagePromise<HelloResult>({
        type: "home_insights/hello",
        card_version: "0.8.2",
      });
    } catch (err) {
      this._error = `Integration not reachable: ${this._asMessage(err)}`;
      this._loading = false;
      return;
    }

    try {
      const result = await this.hass.connection.sendMessagePromise<{ insights: Insight[] }>(
        {
          type: "home_insights/list",
          include_applied: Boolean(this._config.include_applied),
        },
      );
      this._insights = result.insights ?? [];
    } catch (err) {
      this._error = `Could not list insights: ${this._asMessage(err)}`;
      this._loading = false;
      return;
    }

    try {
      this._unsub = await this.hass.connection.subscribeMessage<SubscribeEvent>(
        (event) => this._handleEvent(event),
        { type: "home_insights/subscribe" },
      );
    } catch (err) {
      console.warn("ha-insights-card subscribe failed", err);
    }

    this._loading = false;
  }

  private _handleEvent(event: SubscribeEvent): void {
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

      const message: Record<string, unknown> = {
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

      const message: Record<string, unknown> = {
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
      const payload: Record<string, unknown> = {
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
    const filtered = this._insights
      .filter((i) => i.confidence >= min)
      .filter((i) => !search || i.title.toLowerCase().includes(search));

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

    return filtered.slice(0, cap);
  }

  /** Bucket insights by the configured group_by key. Returns ordered
   *  pairs so the render can produce stable section ordering. */
  private _grouped(rows: Insight[]): Array<[string, Insight[]]> {
    const key = this._config.group_by ?? "none";
    if (key === "none") return [["", rows]];
    const buckets = new Map<string, Insight[]>();
    for (const row of rows) {
      const groupKey =
        key === "area"
          ? row.area_id ?? "(no area)"
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

  private _renderCompactTile(rows: Insight[]): TemplateResult {
    const count = rows.length;
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

  private _renderRow(insight: Insight): TemplateResult {
    const confidencePct = Math.round(insight.confidence * 100);
    const confidenceClass = this._confidenceClass(insight.confidence);
    const ageLabel = this._formatAge(insight.created_at);
    return html`
      <div class="row" @click=${() => this._openDialog(insight.id)}>
        <div class="row-title">${insight.title}</div>
        <div class="row-meta">
          <span class="pill ${confidenceClass}">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${insight.area_id ? html`<span class="pill">${insight.area_id}</span>` : nothing}
          ${this._renderTrustPill()}
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
            ? html`<span class="pill" style="color: var(--warning-color)">conflicts</span>`
            : nothing}
          ${insight.explanation
            ? html`<span class="pill" title="LLM explanation available">💬 explained</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _confidenceClass(confidence: number): string {
    if (confidence >= 0.8) return "confidence-high";
    if (confidence >= 0.5) return "confidence-medium";
    return "confidence-low";
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
                  <h4>Automation that would be created</h4>
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
                    ${llmEnabled
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
                    <button
                      class="action"
                      ?disabled=${this._testBusy}
                      title="Fire the action(s) for real"
                      @click=${() => this._testActions(insight)}
                    >
                      ${this._testBusy ? "testing…" : "🔥 Test actions"}
                    </button>
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
                    : html`<button
                        class="action primary"
                        ?disabled=${busy}
                        @click=${() => this._apply(insight)}
                      >
                        ${busy ? "applying…" : "Apply"}
                      </button>`}
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
    if (this._loading) {
      return html`
        <ha-card>
          ${this._renderHeader()}
          <div class="empty">Loading…</div>
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
      </ha-card>
      ${this._renderDialog()}
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
