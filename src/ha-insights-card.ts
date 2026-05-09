/**
 * HA Insights Lovelace card — v0.1 MVP.
 *
 * Lists insights from the home_insights integration via the stable WS API,
 * subscribes for live updates, exposes Apply / Dismiss / Snooze actions per
 * row. Handshake banner shows integration version and warns on protocol skew.
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
  SubscribeEvent,
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
  @state() private _expandedId?: string;
  @state() private _explainBusy = false;

  private _unsub?: () => void;
  private _toastTimer?: number;
  private _wired = false;

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
    .row.expanded {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }
    .row-header {
      cursor: pointer;
    }
    .detail {
      margin-top: 8px;
      padding: 12px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 6px;
      font-size: 0.85em;
    }
    .detail h4 {
      margin: 0 0 8px;
      font-size: 0.9em;
    }
    .detail pre {
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.4;
    }
    .explanation {
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid var(--primary-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      font-style: italic;
      line-height: 1.5;
    }
    .row {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row:last-child {
      border-bottom: none;
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
    .row-actions {
      display: flex;
      gap: 8px;
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
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsub?.();
    this._unsub = undefined;
    this._wired = false;
  }

  private async _wire(): Promise<void> {
    if (!this.hass) return;
    try {
      this._hello = await this.hass.connection.sendMessagePromise<HelloResult>({
        type: "home_insights/hello",
        card_version: "0.1.0-dev",
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
      // Non-fatal: list works, just no live updates.
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
      // All three remove the insight from the active list (server's list filter
      // excludes applied + dismissed by default; snoozed becomes dormant).
      if (idx >= 0) next.splice(idx, 1);
    } else if (idx >= 0) {
      next[idx] = event.insight;
    }
    this._insights = next;
  }

  /** Optimistic remove — keeps the UX snappy if the subscribe event lags. */
  private _removeFromList(id: string): void {
    this._insights = this._insights.filter((i) => i.id !== id);
  }

  private async _apply(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._busyId = insight.id;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "home_insights/apply",
        insight_id: insight.id,
      });
      this._removeFromList(insight.id);
      this._toast = `Applied: ${insight.title}`;
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

  private _asMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    return String(err);
  }

  private _filtered(): Insight[] {
    const min = this._config.min_confidence ?? 0;
    const max = this._config.max_rows ?? DEFAULT_MAX_ROWS;
    return this._insights
      .filter((i) => i.confidence >= min)
      .slice(0, max);
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

  private _toggleExpanded(insightId: string): void {
    this._expandedId = this._expandedId === insightId ? undefined : insightId;
  }

  private async _explain(insight: Insight): Promise<void> {
    if (!this.hass) return;
    this._explainBusy = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<ExplainResult>({
        type: "home_insights/explain",
        insight_id: insight.id,
      });
      // Update the local copy with the explanation
      this._insights = this._insights.map((i) =>
        i.id === insight.id ? { ...i, explanation: result.explanation } : i,
      );
    } catch (err) {
      this._error = `Explain failed: ${this._asMessage(err)}`;
    } finally {
      this._explainBusy = false;
    }
  }

  private _renderDetail(insight: Insight): TemplateResult {
    const llmEnabled = this._hello?.privacy_mode && this._hello.privacy_mode !== "off";
    return html`
      <div class="detail" @click=${(e: Event) => e.stopPropagation()}>
        <h4>Automation that would be created</h4>
        <pre>${JSON.stringify(insight.payload, null, 2)}</pre>
        ${insight.explanation
          ? html`<div class="explanation">${insight.explanation}</div>`
          : nothing}
        ${llmEnabled && !insight.explanation
          ? html`
              <button
                class="action"
                ?disabled=${this._explainBusy}
                @click=${() => this._explain(insight)}
                style="margin-top: 12px;"
              >
                ${this._explainBusy ? "asking LLM…" : "Explain with LLM"}
              </button>
            `
          : nothing}
        ${!llmEnabled
          ? html`<div class="subtitle" style="margin-top: 12px;">
              LLM Explain disabled — enable Local or Cloud mode in Settings → Devices & Services.
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderRow(insight: Insight): TemplateResult {
    const busy = this._busyId === insight.id;
    const confidencePct = Math.round(insight.confidence * 100);
    const expanded = this._expandedId === insight.id;
    return html`
      <div class="row ${expanded ? "expanded" : ""}">
        <div class="row-header" @click=${() => this._toggleExpanded(insight.id)}>
          <div class="row-title">${insight.title}</div>
          <div class="row-meta">
            <span class="pill">confidence ${confidencePct}%</span>
            <span class="pill">${insight.detector}</span>
            ${insight.area_id ? html`<span class="pill">${insight.area_id}</span>` : nothing}
            ${insight.conflicts_with.length > 0
              ? html`<span class="pill" style="color: var(--warning-color)">conflicts</span>`
              : nothing}
            <span class="pill">${expanded ? "▾" : "▸"}</span>
          </div>
        </div>
        <div class="row-actions" @click=${(e: Event) => e.stopPropagation()}>
          <button class="action primary" ?disabled=${busy} @click=${() => this._apply(insight)}>
            ${busy ? "applying…" : "Apply"}
          </button>
          <button class="action" ?disabled=${busy} @click=${() => this._snooze(insight)}>
            Snooze 7d
          </button>
          <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
            Dismiss
          </button>
        </div>
        ${expanded ? this._renderDetail(insight) : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`<ha-card>${this._renderHeader()}<div class="error">${this._error}</div></ha-card>`;
    }
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
        ${this._toast ? html`<div class="toast">${this._toast}</div>` : nothing}
        ${rows.length === 0
          ? html`<div class="empty">
              Watching your home. New insights appear here as patterns emerge.
            </div>`
          : rows.map((i) => this._renderRow(i))}
      </ha-card>
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
