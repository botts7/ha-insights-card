/**
 * <bulk-area-assign-dialog>
 *
 * Self-contained dialog for bulk-assigning entities + devices to areas.
 * Designed to be **portable to HA core** — uses only HA's standard
 * config-registry WebSocket APIs (`config/area_registry/list`,
 * `config/device_registry/list`, `config/entity_registry/list`,
 * `config/device_registry/update`, `config/entity_registry/update_entity`).
 * No dependency on the HA Insights integration. To upstream this into
 * HA core, lift this file into `frontend/src/dialogs/` and replace the
 * minimal `HassLite` import with the real `HomeAssistant` type.
 *
 * Usage:
 *   <bulk-area-assign-dialog
 *     .hass=${hass}
 *     ?open=${this._open}
 *     @closed=${() => this._open = false}>
 *   </bulk-area-assign-dialog>
 *
 * Behavior:
 *   - Two tabs: Devices (default — area on device cascades to all its
 *     entities) and Entities (per-entity area override, for floating
 *     entities or to break the cascade).
 *   - Lists items WITHOUT an area assigned by default. A "Show all"
 *     toggle reveals already-assigned items for reassignment.
 *   - Per-row dropdown picks from existing areas. To create a new
 *     area, user clicks out to Settings → Areas (deeplink button in
 *     the empty state for the picker).
 *   - Save fires one WS call per changed row. Errors are collected
 *     and shown inline; successful rows are removed from the list.
 *
 * Privacy: no data leaves the user's HA install. All registries are
 * already public state in HA — we're just batch-editing them.
 */
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HassLite } from "../types";

interface AreaRegistryEntry {
  area_id: string;
  name: string;
  floor_id?: string | null;
}
interface DeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
  area_id?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  config_entries?: string[];
  identifiers?: Array<[string, string]>;
  disabled_by?: string | null;
}
interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  area_id?: string | null;
  name?: string | null;
  original_name?: string | null;
  platform?: string;
  disabled_by?: string | null;
  hidden_by?: string | null;
}

@customElement("bulk-area-assign-dialog")
export class BulkAreaAssignDialog extends LitElement {
  @property({ attribute: false }) hass?: HassLite;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _tab: "devices" | "entities" = "devices";
  @state() private _areas: AreaRegistryEntry[] = [];
  @state() private _devices: DeviceRegistryEntry[] = [];
  @state() private _entities: EntityRegistryEntry[] = [];
  /** Map keyed by `device:ID` or `entity:ID` → chosen area_id (or ""
   *  for "clear area"). Empty means no pending change for that row. */
  @state() private _pending = new Map<string, string>();
  @state() private _loading = false;
  @state() private _saving = false;
  @state() private _error?: string;
  @state() private _savedCount = 0;
  @state() private _failedRows: string[] = [];
  /** When true, includes rows that already have an area. Default off
   *  so the first-load picture is "things you haven't classified yet". */
  @state() private _showAll = false;
  @state() private _filter = "";
  /** v1.2.7 — Structured filters in addition to free-text search.
   *  Empty string = "all". Populated from the actual data on fetch
   *  so users only see options they have. */
  @state() private _filterIntegration = "";
  @state() private _filterManufacturer = "";
  @state() private _filterDomain = ""; // entities tab only

  updated(changedProps: Map<string, unknown>): void {
    // Lazy-fetch when the dialog transitions to open.
    if (changedProps.has("open") && this.open && this.hass) {
      void this._fetchRegistries();
    }
  }

  private async _fetchRegistries(): Promise<void> {
    if (!this.hass) return;
    this._loading = true;
    this._error = undefined;
    this._pending = new Map();
    this._savedCount = 0;
    this._failedRows = [];
    try {
      const [areas, devices, entities] = await Promise.all([
        this.hass.connection.sendMessagePromise<AreaRegistryEntry[]>({
          type: "config/area_registry/list",
        }),
        this.hass.connection.sendMessagePromise<DeviceRegistryEntry[]>({
          type: "config/device_registry/list",
        }),
        this.hass.connection.sendMessagePromise<EntityRegistryEntry[]>({
          type: "config/entity_registry/list",
        }),
      ]);
      this._areas = (areas ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      this._devices = (devices ?? []).filter((d) => !d.disabled_by);
      this._entities = (entities ?? []).filter(
        (e) => !e.disabled_by && !e.hidden_by,
      );
    } catch (err) {
      this._error = `Could not load registries: ${this._errMsg(err)}`;
    } finally {
      this._loading = false;
    }
  }

  private _errMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
      return JSON.stringify(err);
    } catch {
      return "unknown error";
    }
  }

  private _deviceLabel(d: DeviceRegistryEntry): string {
    return (
      d.name_by_user ||
      d.name ||
      d.id ||
      "(unnamed device)"
    );
  }
  private _entityLabel(e: EntityRegistryEntry): string {
    return e.name || e.original_name || e.entity_id;
  }
  private _areaNameById(area_id: string | null | undefined): string {
    if (!area_id) return "";
    return this._areas.find((a) => a.area_id === area_id)?.name ?? area_id;
  }

  /** v1.2.7 — Available filter values, derived from the loaded data
   *  so users only see options that exist in their install.
   *  Sorted alphabetically. Empty strings filtered out. */
  private _availableIntegrations(): string[] {
    const set = new Set<string>();
    if (this._tab === "devices") {
      for (const d of this._devices) {
        const ce = d.config_entries?.[0];
        if (ce) {
          // The integration domain isn't directly on the device entry;
          // we use config_entries[0] as a proxy. For per-entity tab
          // we have a more direct `platform` field.
        }
        // Manufacturer is a more reliable signal at device level.
      }
    } else {
      for (const e of this._entities) {
        if (e.platform) set.add(e.platform);
      }
    }
    return [...set].sort();
  }
  private _availableManufacturers(): string[] {
    const set = new Set<string>();
    for (const d of this._devices) {
      if (d.manufacturer) set.add(d.manufacturer);
    }
    return [...set].sort();
  }
  private _availableDomains(): string[] {
    const set = new Set<string>();
    for (const e of this._entities) {
      const dot = e.entity_id.indexOf(".");
      if (dot > 0) set.add(e.entity_id.slice(0, dot));
    }
    return [...set].sort();
  }

  private _filteredDevices(): DeviceRegistryEntry[] {
    const f = this._filter.trim().toLowerCase();
    const fMfr = this._filterManufacturer;
    return this._devices.filter((d) => {
      if (!this._showAll && d.area_id) return false;
      if (fMfr && d.manufacturer !== fMfr) return false;
      if (!f) return true;
      const hay =
        (this._deviceLabel(d) + " " + (d.manufacturer ?? "") + " " +
          (d.model ?? "")).toLowerCase();
      return hay.includes(f);
    });
  }
  private _filteredEntities(): EntityRegistryEntry[] {
    const f = this._filter.trim().toLowerCase();
    const fInt = this._filterIntegration;
    const fDom = this._filterDomain;
    return this._entities.filter((e) => {
      // Skip entities whose device already has an area (cascade
      // handles them). User can flip Show All to override.
      if (!this._showAll) {
        if (e.area_id) return false;
        if (e.device_id) {
          const dev = this._devices.find((d) => d.id === e.device_id);
          if (dev?.area_id) return false;
        }
      }
      if (fInt && e.platform !== fInt) return false;
      if (fDom) {
        const dot = e.entity_id.indexOf(".");
        const dom = dot > 0 ? e.entity_id.slice(0, dot) : "";
        if (dom !== fDom) return false;
      }
      if (!f) return true;
      return e.entity_id.toLowerCase().includes(f) ||
        this._entityLabel(e).toLowerCase().includes(f);
    });
  }

  private _onPick(key: string, area_id: string): void {
    const next = new Map(this._pending);
    if (area_id === "__unchanged__") {
      next.delete(key);
    } else {
      next.set(key, area_id);
    }
    this._pending = next;
  }

  private _onClose = (): void => {
    if (this._saving) return; // don't close mid-save
    this.open = false;
    this.dispatchEvent(
      new CustomEvent("closed", { bubbles: true, composed: true }),
    );
  };

  private async _save(): Promise<void> {
    if (!this.hass || this._pending.size === 0) return;
    this._saving = true;
    this._failedRows = [];
    this._savedCount = 0;
    const failed: string[] = [];
    let saved = 0;
    for (const [key, area_id] of this._pending.entries()) {
      const [kind, id] = key.split(":", 2);
      try {
        if (kind === "device") {
          await this.hass.connection.sendMessagePromise({
            type: "config/device_registry/update",
            device_id: id,
            area_id: area_id || null,
          });
        } else if (kind === "entity") {
          await this.hass.connection.sendMessagePromise({
            type: "config/entity_registry/update_entity",
            entity_id: id,
            area_id: area_id || null,
          });
        }
        saved += 1;
      } catch (err) {
        failed.push(`${id}: ${this._errMsg(err)}`);
      }
    }
    this._savedCount = saved;
    this._failedRows = failed;
    this._saving = false;
    // Refresh registries so the table reflects the saved state.
    // (Cheap; HA caches and returns the new values.)
    await this._fetchRegistries();
    // Emit so the host can refresh its own list / fire a scan.
    this.dispatchEvent(
      new CustomEvent("assignments-saved", {
        detail: { saved, failed: failed.length },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderAreaPicker(
    key: string,
    currentAreaId: string | null | undefined,
  ): TemplateResult {
    const pendingValue = this._pending.get(key);
    // Three-state value: "__unchanged__" (initial), area_id (picked),
    // or "" (explicit clear). Default selected = pendingValue ?? current.
    const selected = pendingValue !== undefined
      ? pendingValue
      : (currentAreaId ?? "__unchanged__");
    return html`
      <select
        class="area-picker"
        .value=${selected}
        @change=${(e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          this._onPick(key, v);
        }}
        ?disabled=${this._saving}
      >
        <option value="__unchanged__">
          ${currentAreaId
            ? `keep current (${this._areaNameById(currentAreaId)})`
            : "— pick an area —"}
        </option>
        ${currentAreaId
          ? html`<option value="">— clear area —</option>`
          : nothing}
        ${this._areas.map(
          (a) => html`<option value=${a.area_id}>${a.name}</option>`,
        )}
      </select>
    `;
  }

  private _renderDeviceRows(): TemplateResult {
    const rows = this._filteredDevices();
    if (rows.length === 0) {
      return html`<div class="empty">
        ${this._showAll
          ? "No devices match the current filter."
          : "Every device has an Area assigned. Toggle Show all to reassign."}
      </div>`;
    }
    return html`
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Manufacturer / Model</th>
            <th>Current area</th>
            <th>New area</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (d) => html`
              <tr>
                <td class="name">${this._deviceLabel(d)}</td>
                <td class="meta">
                  ${d.manufacturer ?? ""}${d.model ? ` · ${d.model}` : ""}
                </td>
                <td class="current">
                  ${d.area_id
                    ? this._areaNameById(d.area_id)
                    : html`<em>none</em>`}
                </td>
                <td>${this._renderAreaPicker(`device:${d.id}`, d.area_id)}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }

  private _renderEntityRows(): TemplateResult {
    const rows = this._filteredEntities();
    if (rows.length === 0) {
      return html`<div class="empty">
        ${this._showAll
          ? "No entities match the current filter."
          : "Every entity has an Area (directly or via its device). Toggle Show all to reassign."}
      </div>`;
    }
    return html`
      <table>
        <thead>
          <tr>
            <th>Entity</th>
            <th>Device</th>
            <th>Current area</th>
            <th>New area</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((e) => {
            const dev = e.device_id
              ? this._devices.find((d) => d.id === e.device_id)
              : undefined;
            const effectiveArea = e.area_id ?? dev?.area_id ?? null;
            return html`
              <tr>
                <td class="name">
                  <div>${this._entityLabel(e)}</div>
                  <div class="meta">${e.entity_id}</div>
                </td>
                <td class="meta">${dev ? this._deviceLabel(dev) : "—"}</td>
                <td class="current">
                  ${effectiveArea
                    ? html`${this._areaNameById(effectiveArea)}
                        ${dev?.area_id && !e.area_id
                          ? html`<span class="cascade">(from device)</span>`
                          : nothing}`
                    : html`<em>none</em>`}
                </td>
                <td>
                  ${this._renderAreaPicker(`entity:${e.entity_id}`, e.area_id)}
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;
    const pendingCount = this._pending.size;
    return html`
      <div class="backdrop" @click=${this._onClose}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="header">
            <div class="title">📍 Bulk assign areas</div>
            <button class="close" aria-label="Close" @click=${this._onClose}>
              ×
            </button>
          </div>
          <div class="body">
            ${this._error
              ? html`<div class="error">${this._error}</div>`
              : nothing}
            ${this._savedCount > 0
              ? html`<div class="success">
                  ✓ Saved ${this._savedCount} assignment${
                    this._savedCount === 1 ? "" : "s"
                  }.
                </div>`
              : nothing}
            ${this._failedRows.length > 0
              ? html`<div class="error">
                  ${this._failedRows.length} row${
                    this._failedRows.length === 1 ? "" : "s"
                  } failed to save:
                  <ul>
                    ${this._failedRows.map((r) => html`<li>${r}</li>`)}
                  </ul>
                </div>`
              : nothing}
            <div class="toolbar">
              <div class="tabs">
                <button
                  class="tab ${this._tab === "devices" ? "active" : ""}"
                  @click=${() => (this._tab = "devices")}
                >
                  Devices
                </button>
                <button
                  class="tab ${this._tab === "entities" ? "active" : ""}"
                  @click=${() => (this._tab = "entities")}
                >
                  Entities
                </button>
              </div>
              <div class="filters">
                <input
                  type="search"
                  placeholder="Filter by name…"
                  .value=${this._filter}
                  @input=${(e: Event) =>
                    (this._filter = (e.target as HTMLInputElement).value)}
                />
                ${this._tab === "devices"
                  ? html`
                      <select
                        class="filter-select"
                        .value=${this._filterManufacturer}
                        @change=${(e: Event) =>
                          (this._filterManufacturer = (
                            e.target as HTMLSelectElement
                          ).value)}
                      >
                        <option value="">All manufacturers</option>
                        ${this._availableManufacturers().map(
                          (m) => html`<option value=${m}>${m}</option>`,
                        )}
                      </select>
                    `
                  : html`
                      <select
                        class="filter-select"
                        .value=${this._filterIntegration}
                        @change=${(e: Event) =>
                          (this._filterIntegration = (
                            e.target as HTMLSelectElement
                          ).value)}
                      >
                        <option value="">All integrations</option>
                        ${this._availableIntegrations().map(
                          (i) => html`<option value=${i}>${i}</option>`,
                        )}
                      </select>
                      <select
                        class="filter-select"
                        .value=${this._filterDomain}
                        @change=${(e: Event) =>
                          (this._filterDomain = (
                            e.target as HTMLSelectElement
                          ).value)}
                      >
                        <option value="">All types</option>
                        ${this._availableDomains().map(
                          (d) => html`<option value=${d}>${d}</option>`,
                        )}
                      </select>
                    `}
                <label class="show-all">
                  <input
                    type="checkbox"
                    .checked=${this._showAll}
                    @change=${(e: Event) =>
                      (this._showAll = (e.target as HTMLInputElement).checked)}
                  />
                  Show all (incl. already assigned)
                </label>
              </div>
            </div>
            ${this._loading
              ? html`<div class="empty">Loading registries…</div>`
              : this._tab === "devices"
                ? this._renderDeviceRows()
                : this._renderEntityRows()}
            <div class="hint">
              Need a new area first?
              <a href="/config/areas/dashboard">Create one in
                Settings → Areas</a>, then re-open this dialog.
            </div>
          </div>
          <div class="footer">
            <button
              class="btn"
              @click=${this._onClose}
              ?disabled=${this._saving}
            >
              ${pendingCount > 0 ? "Cancel" : "Close"}
            </button>
            <button
              class="btn primary"
              @click=${this._save}
              ?disabled=${pendingCount === 0 || this._saving}
            >
              ${this._saving
                ? "Saving…"
                : pendingCount > 0
                  ? `Save ${pendingCount} change${
                      pendingCount === 1 ? "" : "s"
                    }`
                  : "No changes"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      /* All styling via HA CSS variables — keeps this component
         portable to HA core's frontend. */
      --bulk-row-bg: var(--card-background-color, #fff);
      --bulk-row-alt: var(--secondary-background-color, #f7f7f7);
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .dialog {
      width: min(960px, 96vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .title {
      font-size: 1.15em;
      font-weight: 500;
    }
    .close {
      background: none;
      border: none;
      font-size: 1.6em;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .body {
      flex: 1;
      overflow: auto;
      padding: 14px 18px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .tabs {
      display: flex;
      gap: 6px;
    }
    .tab {
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      padding: 6px 12px;
      border-radius: 16px;
      cursor: pointer;
      font-size: 0.95em;
      color: var(--secondary-text-color);
    }
    .tab.active {
      background: var(--primary-color, #4c6ef5);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #4c6ef5);
    }
    .filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filters input[type="search"] {
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      min-width: 180px;
    }
    .filter-select {
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      min-width: 130px;
    }
    .show-all {
      font-size: 0.9em;
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92em;
    }
    th {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: var(--bulk-row-alt);
    }
    td.name {
      font-weight: 500;
    }
    td.meta,
    div.meta {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    td.current em {
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .cascade {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-left: 4px;
    }
    .area-picker {
      width: 100%;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .empty {
      padding: 32px 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .hint {
      margin-top: 16px;
      padding: 10px 12px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      font-size: 0.88em;
      color: var(--secondary-text-color);
    }
    .hint a {
      color: var(--primary-color, #4c6ef5);
    }
    .error {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(244, 67, 54, 0.08);
      border-left: 3px solid var(--error-color, #c62828);
      border-radius: 4px;
      color: var(--primary-text-color);
      font-size: 0.92em;
    }
    .success {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(76, 175, 80, 0.12);
      border-left: 3px solid var(--success-color, #4caf50);
      border-radius: 4px;
      color: var(--primary-text-color);
      font-size: 0.92em;
    }
    .footer {
      padding: 12px 18px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, #fafafa);
    }
    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      cursor: pointer;
      font-size: 0.95em;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn.primary {
      background: var(--primary-color, #4c6ef5);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #4c6ef5);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bulk-area-assign-dialog": BulkAreaAssignDialog;
  }
}
