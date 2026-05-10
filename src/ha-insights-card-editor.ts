/**
 * Visual config editor for ha-insights-card.
 *
 * Uses HA's <ha-form> element so the form picks up the user's theme,
 * uses native entity pickers, sliders, etc. The schema is the single
 * source of truth for the editor UI.
 */
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { CardConfig, HassLite } from "./types";

interface HaFormSchema {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

const SCHEMA: HaFormSchema[] = [
  { name: "title", selector: { text: {} } },
  {
    name: "min_confidence",
    selector: {
      number: {
        min: 0,
        max: 1,
        step: 0.05,
        mode: "slider",
      },
    },
  },
  {
    name: "max_rows",
    selector: {
      number: {
        min: 0,
        max: 100,
        step: 1,
        mode: "box",
      },
    },
  },
  {
    name: "compact",
    selector: { boolean: {} },
  },
  {
    name: "tts_target_entity_id",
    selector: { entity: { domain: "media_player" } },
  },
  {
    name: "tts_engine_entity_id",
    selector: { entity: { domain: "tts" } },
  },
  {
    name: "search",
    selector: { text: {} },
  },
  {
    name: "include_dismissed",
    selector: { boolean: {} },
  },
  {
    name: "include_applied",
    selector: { boolean: {} },
  },
  {
    name: "sort_by",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "confidence", label: "Confidence (highest first)" },
          { value: "age", label: "Age (newest first)" },
          { value: "detector", label: "Detector name" },
          { value: "area", label: "Area" },
        ],
      },
    },
  },
  {
    name: "group_by",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "none", label: "No grouping" },
          { value: "detector", label: "By detector" },
          { value: "area", label: "By area" },
        ],
      },
    },
  },
];

const LABELS: Record<string, string> = {
  title: "Card title",
  min_confidence: "Minimum confidence",
  max_rows: "Max rows (leave blank for auto-fit)",
  compact: "Compact tile mode (single-line summary linking to panel)",
  tts_target_entity_id: "TTS target (media_player) — shows 🔊 Read aloud",
  tts_engine_entity_id: "TTS engine (optional override)",
  search: "Default search filter (case-insensitive title match)",
  include_dismissed: "Show dismissed insights",
  include_applied: "Show insights you've already applied",
  sort_by: "Sort order",
  group_by: "Group rows by",
};

export class HaInsightsCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HassLite;
  @state() private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) return html``;
    // ha-form is a custom element that HA's frontend registers globally.
    // We don't import a class; we just render the tag.
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._onChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: { name: string }): string =>
    LABELS[schema.name] ?? schema.name;

  private _onChanged(ev: CustomEvent): void {
    const incoming = { ...ev.detail.value } as Record<string, unknown>;
    // Strip empties so the YAML stays clean (HA's frontend inserts "" for
    // text fields the user clears, which would otherwise persist as noise).
    for (const key of Object.keys(incoming)) {
      const value = incoming[key];
      if (value === "" || value === null) {
        delete incoming[key];
      }
    }
    // type field is required by Lovelace; preserve it
    if (this._config?.type && !("type" in incoming)) {
      incoming.type = this._config.type;
    }
    const next = incoming as CardConfig;
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

// Guard against double-registration — same rationale as ha-insights-card.
if (!customElements.get("ha-insights-card-editor")) {
  customElements.define("ha-insights-card-editor", HaInsightsCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-insights-card-editor": HaInsightsCardEditor;
  }
}
