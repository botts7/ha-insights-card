import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("ha-insights-card")
export class HaInsightsCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      font-family: var(--paper-font-body1_-_font-family);
    }
  `;

  render() {
    return html`<div>HA Insights — pre-alpha card stub.</div>`;
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
  description: "Lovelace card for the HA Insights integration",
});
