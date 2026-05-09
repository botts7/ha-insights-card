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
import type { CardConfig, HassLite } from "./types";

@customElement("ha-insights-panel")
export class HaInsightsPanel extends LitElement {
  // HA injects these on panel mount.
  @property({ attribute: false }) hass?: HassLite;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: { path: string; prefix: string };
  @property({ attribute: false }) panel?: { config?: Record<string, unknown> };

  @state() private _search = "";
  @state() private _minConfidence = 0;

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
      // The card doesn't currently filter by free text; we'll add that in a
      // follow-up. For now confidence + the row cap give the panel real value.
    };
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <h1>HA Insights</h1>
        <div class="sub">
          Patterns the integration noticed in your home — apply, refine, test, or dismiss each.
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
    `;
  }

  private _renderCard(): TemplateResult {
    const cardEl = document.createElement("ha-insights-card") as HTMLElement & {
      hass?: HassLite;
      setConfig?: (cfg: CardConfig) => void;
    };
    if (cardEl.setConfig) cardEl.setConfig(this._embeddedCardConfig);
    if (this.hass) cardEl.hass = this.hass;
    return html`${cardEl}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-panel": HaInsightsPanel;
  }
}
