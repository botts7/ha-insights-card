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

export class HaInsightsPanel extends LitElement {
  // HA injects these on panel mount.
  @property({ attribute: false }) hass?: HassLite;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: { path: string; prefix: string };
  @property({ attribute: false }) panel?: { config?: Record<string, unknown> };

  @state() private _search = "";
  @state() private _minConfidence = 0;
  @state() private _sortBy: "confidence" | "age" | "detector" = "confidence";
  @state() private _groupBy: "area" | "detector" | "none" = "none";
  @state() private _backfillBusy = false;
  @state() private _bulkBusy = false;
  @state() private _scanBusy = false;
  @state() private _toast = "";
  @state() private _auditOpen = false;
  @state() private _auditLog: AuditLogCall[] = [];
  @state() private _auditBusy = false;
  private _toastTimer?: number;
  // Persistent filter storage (v0.8 phase 6). Versioned key so future
  // shape changes can ignore old saved state cleanly.
  private static readonly _STORAGE_KEY = "ha-insights-panel-filters-v1";

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
  }

  protected updated(): void {
    // Save on any filter change. Cheap (<1 KB stringify) and synchronous.
    this._saveFilters();
  }

  private _loadFilters(): void {
    try {
      const raw = window.localStorage.getItem(HaInsightsPanel._STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.search === "string") this._search = saved.search;
      if (typeof saved.minConfidence === "number") {
        this._minConfidence = saved.minConfidence;
      }
      if (saved.sortBy === "confidence" || saved.sortBy === "age" || saved.sortBy === "detector") {
        this._sortBy = saved.sortBy;
      }
      if (saved.groupBy === "none" || saved.groupBy === "detector" || saved.groupBy === "area") {
        this._groupBy = saved.groupBy;
      }
      if (typeof saved.auditOpen === "boolean") this._auditOpen = saved.auditOpen;
    } catch {
      // Corrupted localStorage entry; fall back to defaults.
    }
  }

  private _saveFilters(): void {
    try {
      window.localStorage.setItem(
        HaInsightsPanel._STORAGE_KEY,
        JSON.stringify({
          search: this._search,
          minConfidence: this._minConfidence,
          sortBy: this._sortBy,
          groupBy: this._groupBy,
          auditOpen: this._auditOpen,
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
    const key = `${this._search}|${this._minConfidence}|${this._sortBy}|${this._groupBy}`;
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
      };
    }
    return this._cachedCardConfig!;
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
    if (!this.hass || this._scanBusy) return;
    // Use the home_insights/scan_now WS endpoint instead of call_service —
    // it awaits the actual scan completion + returns a count, giving us
    // real "scan finished" feedback. call_service was returning the moment
    // the call was queued, so the user got "Scan complete" instantly while
    // the scan was still running, with no in-progress feedback.
    this._scanBusy = true;
    this._showToast("Scanning…");
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        detectors_run: string[];
        insights_emitted: number;
        canceled?: boolean;
      }>({ type: "home_insights/scan_now" });
      const noun = result.insights_emitted === 1 ? "insight" : "insights";
      const verb = result.canceled ? "canceled" : "complete";
      this._showToast(
        `Scan ${verb}: ${result.insights_emitted} new ${noun} from ${result.detectors_run.length} detectors`,
      );
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
      this._showToast("Purged all insights");
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
            ?disabled=${this._scanBusy}
            title="Run all detectors against the current buffer"
            @click=${this._runScanNow}
          >
            ${this._scanBusy ? "Scanning…" : "🔍 Scan now"}
          </button>
          ${this._scanBusy
            ? html`<button
                class="action"
                title="Stop the in-flight scan after the current detector"
                @click=${this._cancelScan}
              >
                ⏹ Stop
              </button>`
            : ""}
          <button
            class="action"
            title="Delete every stored insight (useful when a noisy scan filled the list)"
            @click=${this._purgeAllInsights}
          >
            🗑 Purge all
          </button>
          <button
            class="action"
            ?disabled=${this._bulkBusy}
            title="Apply every visible automation insight (respects search + confidence filters)"
            @click=${this._runBulkApply}
          >
            ${this._bulkBusy ? "Applying…" : "✓ Apply all visible"}
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
        </select>
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
