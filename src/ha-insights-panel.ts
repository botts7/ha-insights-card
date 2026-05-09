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
import { LitElement, html, css, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./ha-insights-card";
import type { AuditLogCall, CardConfig, HassLite } from "./types";

@customElement("ha-insights-panel")
export class HaInsightsPanel extends LitElement {
  // HA injects these on panel mount.
  @property({ attribute: false }) hass?: HassLite;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: { path: string; prefix: string };
  @property({ attribute: false }) panel?: { config?: Record<string, unknown> };

  @state() private _search = "";
  @state() private _minConfidence = 0;
  @state() private _backfillBusy = false;
  @state() private _toast = "";
  @state() private _auditOpen = false;
  @state() private _auditLog: AuditLogCall[] = [];
  @state() private _auditBusy = false;
  private _toastTimer?: number;

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
    @media (max-width: 600px) {
      .header,
      .filters,
      .body {
        padding-left: 12px;
        padding-right: 12px;
      }
    }
  `;

  private _onSearch(e: Event): void {
    this._search = (e.target as HTMLInputElement).value;
  }

  private _onConfidence(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    this._minConfidence = Number.isFinite(value) ? value : 0;
  }

  private get _embeddedCardConfig(): CardConfig {
    return {
      type: "custom:ha-insights-card",
      title: this._search ? `Insights matching "${this._search}"` : "All insights",
      max_rows: 9999,
      min_confidence: this._minConfidence,
      search: this._search,
    };
  }

  private async _runBackfill(): Promise<void> {
    if (!this.hass) return;
    this._backfillBusy = true;
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
    } catch (err) {
      this._showToast(
        `Backfill failed: ${(err as { message?: string }).message ?? String(err)}`,
      );
    } finally {
      this._backfillBusy = false;
    }
  }

  private async _runScanNow(): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "ha_insights",
        service: "scan_now",
        service_data: {},
      });
      this._showToast("Scan complete");
    } catch (err) {
      this._showToast(
        `Scan failed: ${(err as { message?: string }).message ?? String(err)}`,
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
        </div>
        <div class="actions">
          <button
            class="action"
            ?disabled=${this._backfillBusy}
            title="Re-populate the buffer from HA's recorder"
            @click=${this._runBackfill}
          >
            ${this._backfillBusy ? "Backfilling…" : "🔄 Backfill"}
          </button>
          <button
            class="action"
            title="Run all detectors against the current buffer"
            @click=${this._runScanNow}
          >
            🔍 Scan now
          </button>
        </div>
      </div>
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
      </div>
      <div class="body">
        ${this._renderCard()}
      </div>
      ${this._renderAuditLog()}
      ${this._toast ? html`<div class="toast">${this._toast}</div>` : ""}
    `;
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-panel": HaInsightsPanel;
  }
}
