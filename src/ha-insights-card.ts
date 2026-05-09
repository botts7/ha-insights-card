/**
 * HA Insights Lovelace card.
 *
 * Lists insights from the home_insights integration via the stable WS API,
 * subscribes for live updates, and opens a modal dialog for details +
 * Apply / Dismiss / Snooze / Explain / TTS actions. Compact rows so the
 * card stays a fixed height regardless of how many insights are open.
 */
import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type {
  CardConfig,
  ExplainResult,
  HassLite,
  HelloResult,
  Insight,
  PrivacyMode,
  RefineResult,
  RefinedState,
  SubscribeEvent,
  TestActionsResult,
} from "./types";

const CARD_PROTOCOL_VERSION = 1;
const DEFAULT_MAX_ROWS = 8;

@customElement("ha-insights-card")
export class HaInsightsCard extends LitElement {
  @property({ attribute: false }) hass?: HassLite;
  @state() private _config: CardConfig = { type: "custom:ha-insights-card" };
  @state() private _hello?: HelloResult;
  @state() private _insights: Insight[] = [];
  @state() private _error?: string;
  @state() private _loading = true;
  @state() private _busyId?: string;
  @state() private _toast?: string;
  @state() private _dialogId?: string;
  @state() private _explainBusy = false;
  @state() private _ttsBusy = false;
  @state() private _refineBusy = false;
  @state() private _testBusy = false;
  /** Per-insight refined preview held in card state until Apply or Keep Original. */
  @state() private _refinedById = new Map<string, RefinedState>();

  private _unsub?: () => void;
  private _toastTimer?: number;
  private _wired = false;
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
      max-width: 600px;
      width: 100%;
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
      font-size: 0.8em;
      line-height: 1.4;
      margin: 0;
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

  getCardSize(): number {
    return Math.min(this._insights.length, this._config.max_rows ?? DEFAULT_MAX_ROWS) + 2;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._keydownHandler);
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
  }

  private async _wire(): Promise<void> {
    if (!this.hass) return;
    try {
      this._hello = await this.hass.connection.sendMessagePromise<HelloResult>({
        type: "home_insights/hello",
        card_version: "0.3.0-dev",
      });
    } catch (err) {
      this._error = `Integration not reachable: ${this._asMessage(err)}`;
      this._loading = false;
      return;
    }

    try {
      const result = await this.hass.connection.sendMessagePromise<{ insights: Insight[] }>(
        { type: "home_insights/list" },
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
    if (event.action === "added") {
      if (idx >= 0) next[idx] = event.insight;
      else next.unshift(event.insight);
    } else if (
      event.action === "dismissed" ||
      event.action === "applied" ||
      event.action === "snoozed"
    ) {
      if (idx >= 0) next.splice(idx, 1);
      // If the dialog was open on the removed insight, close it.
      if (this._dialogId === event.insight.id) this._closeDialog();
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

  private async _apply(insight: Insight, override?: Record<string, unknown>): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      const payload: Record<string, unknown> = {
        type: "home_insights/apply",
        insight_id: insight.id,
      };
      if (override) payload.payload_override = override;
      await this.hass.connection.sendMessagePromise(payload);
      this._refinedById.delete(insight.id);
      this._removeFromList(insight.id);
      this._toast = override ? `Applied refined: ${insight.title}` : `Applied: ${insight.title}`;
    } catch (err) {
      this._error = `Apply failed: ${this._asMessage(err)}`;
    } finally {
      this._busyId = undefined;
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
      this._error = `Dismiss failed: ${this._asMessage(err)}`;
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
      this._error = `Snooze failed: ${this._asMessage(err)}`;
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
      this._error = `Explain failed: ${this._asMessage(err)}`;
    } finally {
      this._explainBusy = false;
    }
  }

  private async _refine(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._refineBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<RefineResult>({
        type: "home_insights/refine",
        insight_id: insight.id,
      });
      const next = new Map(this._refinedById);
      next.set(insight.id, {
        payload: result.refined_payload,
        rationale: result.rationale,
        diffSummary: result.diff_summary,
      });
      this._refinedById = next;
      this._toast = result.diff_summary.length > 0
        ? `Refined: ${result.diff_summary.length} change(s) proposed`
        : "Refined: no changes proposed";
    } catch (err) {
      this._error = `Refine failed: ${this._asMessage(err)}`;
    } finally {
      this._refineBusy = false;
    }
  }

  private _keepOriginal(insightId: string): void {
    const next = new Map(this._refinedById);
    next.delete(insightId);
    this._refinedById = next;
    this._toast = "Kept original";
  }

  private async _testActions(insight: Insight, override?: Record<string, unknown>): Promise<void> {
    if (!this.hass) return;
    const which = override ? "refined" : "original";
    if (!window.confirm(
      `This will fire the ${which} action(s) for real (turning on lights, etc). Continue?`,
    )) return;
    this._testBusy = true;
    try {
      const payload: Record<string, unknown> = {
        type: "home_insights/test_actions",
        insight_id: insight.id,
      };
      if (override) payload.payload_override = override;
      const result = await this.hass.connection.sendMessagePromise<TestActionsResult>(payload);
      if (result.error_count > 0) {
        const firstError = result.results.find((r) => !r.ok && !r.skipped)?.error ?? "unknown";
        this._error = `Test ran ${result.ran}, ${result.error_count} error(s): ${firstError}`;
      } else {
        this._toast = `Tested: ran ${result.ran} action(s)`;
      }
    } catch (err) {
      this._error = `Test actions failed: ${this._asMessage(err)}`;
    } finally {
      this._testBusy = false;
    }
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
      this._error =
        "No TTS engine found. Install one (Piper / Google Cloud / Nabu Casa) or set " +
        "tts_engine_entity_id in the card config.";
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
      this._error = `TTS failed: ${this._asMessage(err)}`;
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
    const max = this._config.max_rows ?? DEFAULT_MAX_ROWS;
    return this._insights.filter((i) => i.confidence >= min).slice(0, max);
  }

  private _openDialog(insightId: string): void {
    this._dialogId = insightId;
  }

  private _closeDialog(): void {
    this._dialogId = undefined;
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
        <div class="title">
          ${title} ${this._renderModeBadge(this._hello?.privacy_mode)}
        </div>
        <div class="subtitle">${sub}</div>
      </div>
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
    return html`
      <div class="row" @click=${() => this._openDialog(insight.id)}>
        <div class="row-title">${insight.title}</div>
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${insight.area_id ? html`<span class="pill">${insight.area_id}</span>` : nothing}
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
      <h4>Refined automation</h4>
      <pre>${JSON.stringify(refined.payload, null, 2)}</pre>
      <div class="explain-row">
        <button
          class="action"
          ?disabled=${this._refineBusy}
          @click=${() => this._refine(insight)}
        >
          ${this._refineBusy ? "asking LLM…" : "Refine again"}
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
                ${this._renderRefinedPreview(insight, refined)}
              </div>`
            : html`
                <div class="dialog-body">
                  <div class="row-meta">
                    <span class="pill">confidence ${confidencePct}%</span>
                    <span class="pill">${insight.detector}</span>
                    ${insight.area_id ? html`<span class="pill">${insight.area_id}</span>` : nothing}
                    ${insight.conflicts_with.length > 0
                      ? html`<span class="pill" style="color: var(--warning-color)">conflicts</span>`
                      : nothing}
                  </div>
                  <h4>Automation that would be created</h4>
                  <pre>${JSON.stringify(insight.payload, null, 2)}</pre>
                  ${insight.explanation
                    ? html`<div class="explanation">${insight.explanation}</div>`
                    : nothing}
                  <div class="explain-row">
                    ${llmEnabled && !insight.explanation
                      ? html`
                          <button
                            class="action"
                            ?disabled=${this._explainBusy}
                            @click=${() => this._explain(insight)}
                          >
                            ${this._explainBusy ? "asking LLM…" : "Explain with LLM"}
                          </button>
                        `
                      : nothing}
                    ${llmEnabled
                      ? html`
                          <button
                            class="action"
                            ?disabled=${this._refineBusy}
                            title="Ask the LLM to refine this automation"
                            @click=${() => this._refine(insight)}
                          >
                            ${this._refineBusy ? "asking LLM…" : "✨ Refine with LLM"}
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
                  <button class="action" ?disabled=${busy} @click=${() => this._snooze(insight)}>
                    Snooze 7d
                  </button>
                  <button
                    class="action primary"
                    ?disabled=${busy}
                    @click=${() => this._apply(insight)}
                  >
                    ${busy ? "applying…" : "Apply"}
                  </button>
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
    return html`
      <ha-card>
        ${this._renderHeader()}
        ${this._renderSkewBanner()}
        ${this._renderErrorBanner()}
        ${this._toast ? html`<div class="toast">${this._toast}</div>` : nothing}
        ${rows.length === 0
          ? html`<div class="empty">
              Watching your home. New insights appear here as patterns emerge.
            </div>`
          : rows.map((i) => this._renderRow(i))}
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-insights-card",
  name: "HA Insights Card",
  description: "Shows insights from the HA Insights integration",
});
