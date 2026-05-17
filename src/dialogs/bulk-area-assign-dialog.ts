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
import { property, state } from "lit/decorators.js";
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
  // v1.2.14: structured per-row record of what got assigned so the
  // success banner can render a "Kitchen TV → Kitchen" list instead
  // of a bare count. Format: { label, area_name } per successfully-
  // saved row, in the order they were saved.
  @state() private _savedAssignments: Array<{
    label: string;
    area_name: string;
  }> = [];
  /** When true, includes rows that already have an area. Default off
   *  so the first-load picture is "things you haven't classified yet". */
  @state() private _showAll = false;
  @state() private _filter = "";
  /** v1.5.0 — Optional HA Insights enrichment. When the HA Insights
   *  integration is installed (v1.10.0+), we call
   *  `home_insights/identify_capability` to score each entity's name
   *  quality and sort worst-named entities to the top so the user
   *  tackles the genuinely-confusing ones first.
   *
   *  Falls back silently when the WS endpoint isn't available
   *  (vanilla HA install). The dialog remains fully functional
   *  without the integration — sorting just stays alphabetical.
   *
   *  Map: entity_id → { score (0-1), tier, chosen_name }.
   *  Empty map = enrichment didn't run or returned no data. */
  @state() private _nameQuality = new Map<
    string,
    { score: number; tier: string; chosen_name: string }
  >();
  /** v1.6.0 — Per-entity identify capability (from the same
   *  home_insights/identify_capability response that populates
   *  _nameQuality). When `supported === true` we render a 🔆 button
   *  the user can click to fire `home_insights/identify_entity`. */
  @state() private _identifyCaps = new Map<
    string,
    {
      method: string;
      description: string;
      supported: boolean;
      // v1.9.0 — added when paired with integration v1.10.7+.
      // Card uses these as the authoritative perturbable-check;
      // falls back to the hardcoded set when integration is older.
      device_class?: string | null;
      perturbable?: boolean;
      perturbation_state?: "supported" | "explicitly_unsupported" | "unknown";
    }
  >();
  /** v1.6.0 — Per-entity identify-request lifecycle state.
   *
   *  - "idle": no request in flight, button is clickable
   *  - "pending": request fired, awaiting response (button disabled)
   *  - "success": last request succeeded — show ✓ confirmation
   *  - "failed": last request errored — show ✗ + error message
   *
   *  Success / failed states auto-clear after 3s so the user can
   *  click again. */
  @state() private _identifyState = new Map<
    string,
    { status: "idle" | "pending" | "success" | "failed"; message?: string }
  >();
  /** v1.7.0 — Dedup hints from HA Insights v1.10.3+. Each entity's
   *  `same_as` array enumerates other entity_ids that LOOK like the
   *  same physical device based on static identifiers (MAC, Bluetooth,
   *  Zigbee IEEE, IP, identifier overlap, mfr+model+via_device).
   *
   *  We threshold at confidence >= 0.7 for the pill — below that the
   *  signal is too noisy to surface in row context (a tooltip is one
   *  thing; suggesting "this is the same device" without strong
   *  evidence undermines trust).
   *
   *  Bidirectional: a → b match AND b → a match both surface; the
   *  user can act on either side. Don't try to deduplicate the
   *  display — both rows benefit from seeing the link. */
  @state() private _dedupHints = new Map<
    string,
    Array<{ entity_id: string; reason: string; confidence: number }>
  >();
  /** v1.8.0 — Touch-test (perturbation) modal state.
   *
   *  Phase B of Find-My-Device: when the user can't fire 🔆 because
   *  the entity is a passive sensor, they click 👆 instead. Modal
   *  opens with per-device_class instruction ("place a finger on it
   *  for 10s"), user clicks Start, server captures baseline + opens
   *  N-second listening window, returns ranked z-scores. Modal
   *  shows the result — including the killer **elimination**
   *  message when the entity that spiked isn't the one the user
   *  clicked. */
  @state() private _touchTestOpen = false;
  @state() private _touchTestEntity = "";
  @state() private _touchTestDeviceClass = "";
  @state() private _touchTestGuide:
    | {
        instruction: string;
        expected_delta: number;
        listening_window_s: number;
        perturb_duration_s: number;
      }
    | null = null;
  @state() private _touchTestPhase:
    | "loading_guide"
    | "ready"
    | "running"
    | "done"
    | "error" = "loading_guide";
  @state() private _touchTestResult: {
    decision: "clear" | "ambiguous" | "no_signal";
    top_match: string | null;
    runner_up_gap: number | null;
    reason: string;
    candidates: Array<{
      entity_id: string;
      peak_delta: number;
      z_score: number;
      spike_detected: boolean;
    }>;
  } | null = null;
  @state() private _touchTestCountdown = 0;
  @state() private _touchTestError = "";
  @state() private _touchTestCandidateCount = 0;

  /** Browser-side countdown timer ID, so we can cancel on close. */
  private _touchTestTimer: ReturnType<typeof setInterval> | null = null;

  /** Fallback set used when the integration is older than v1.10.7
   *  and doesn't include `perturbable` in the identify_capability
   *  response. Keep loosely in sync with
   *  lib/perturbation_capability.py — drift here only affects
   *  pre-v1.10.7 integrations, which won't get new device_classes
   *  added to the list anyway. */
  private static readonly _PERTURBABLE_FALLBACK: ReadonlySet<string> =
    new Set([
      "temperature",
      "humidity",
      "carbon_dioxide",
      "illuminance",
      "sound_pressure",
      "moisture",
    ]);
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

  private async _fetchRegistries(opts?: {
    preserveSavedState?: boolean;
  }): Promise<void> {
    if (!this.hass) return;
    this._loading = true;
    this._error = undefined;
    // v1.2.14: don't reset saved-state on post-save refreshes — the
    // success banner is the user's confirmation that the save worked,
    // and clobbering it 50ms later made the dialog look like it
    // "popped up for a second then disappeared". On dialog OPEN we
    // do reset (preserveSavedState left default) since the prior
    // session's saved-state is stale by then.
    if (!opts?.preserveSavedState) {
      this._pending = new Map();
      this._savedCount = 0;
      this._failedRows = [];
      this._savedAssignments = [];
    }
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
      // v1.5.0 — opportunistic name-quality enrichment via HA
      // Insights. Fire-and-forget; the dialog renders alphabetically
      // while this is in flight, then re-sorts on completion.
      void this._fetchNameQuality();
    } catch (err) {
      this._error = `Could not load registries: ${this._errMsg(err)}`;
    } finally {
      this._loading = false;
    }
  }

  /** Best-effort fetch of name_quality scores via HA Insights
   *  v1.10.0+. Silently absent on installs without the integration. */
  private async _fetchNameQuality(): Promise<void> {
    if (!this.hass || this._entities.length === 0) return;
    // Only ask for entities without areas — the others won't be shown
    // by default and don't need scoring. Cap at 500 to keep the WS
    // round-trip snappy even on huge installs.
    const candidates = this._entities
      .filter((e) => !e.area_id)
      .slice(0, 500)
      .map((e) => e.entity_id);
    if (candidates.length === 0) return;
    try {
      const resp = await this.hass.connection.sendMessagePromise<{
        capabilities: Record<
          string,
          {
            method?: string;
            description?: string;
            supported?: boolean;
            // v1.10.7+
            device_class?: string | null;
            perturbable?: boolean;
            perturbation_state?:
              | "supported"
              | "explicitly_unsupported"
              | "unknown";
            name_quality?: {
              score: number;
              tier: string;
              chosen_name: string;
            };
            same_as?: Array<{
              entity_id: string;
              reason: string;
              confidence: number;
            }>;
          }
        >;
      }>({
        type: "home_insights/identify_capability",
        entity_ids: candidates,
      });
      const nextNq = new Map<
        string,
        { score: number; tier: string; chosen_name: string }
      >();
      const nextCaps = new Map<
        string,
        { method: string; description: string; supported: boolean }
      >();
      const nextDedup = new Map<
        string,
        Array<{ entity_id: string; reason: string; confidence: number }>
      >();
      for (const [eid, cap] of Object.entries(resp.capabilities ?? {})) {
        if (cap.name_quality) {
          nextNq.set(eid, {
            score: cap.name_quality.score,
            tier: cap.name_quality.tier,
            chosen_name: cap.name_quality.chosen_name,
          });
        }
        if (cap.method && cap.description !== undefined) {
          nextCaps.set(eid, {
            method: cap.method,
            description: cap.description,
            supported: !!cap.supported,
            device_class: cap.device_class ?? null,
            perturbable: cap.perturbable,
            perturbation_state: cap.perturbation_state,
          });
        }
        if (Array.isArray(cap.same_as) && cap.same_as.length > 0) {
          nextDedup.set(eid, cap.same_as);
        }
      }
      this._nameQuality = nextNq;
      this._identifyCaps = nextCaps;
      this._dedupHints = nextDedup;
    } catch {
      // HA Insights not installed, or older version without the
      // endpoint, or a transient error. Sorting falls back to
      // alphabetical; no UI message — this is enrichment, not a
      // hard dependency.
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

  /** v1.5.0 — render a tier indicator badge per entity row.
   *
   *  Only renders when name_quality data is available AND the tier
   *  is informative (skip the middle "friendly" tier to avoid
   *  cluttering rows that don't need user attention). Mac-pattern
   *  and generic_domain tiers get prominent icons — those are the
   *  rows the user should focus on. Cloud / user-override tiers
   *  get a subtle ✓ that says "this name is fine, no need to
   *  re-investigate."
   *
   *  Tooltip carries the score + reason from the integration so
   *  power users can verify the call.
   */
  private _renderNameQualityBadge(
    nq:
      | { score: number; tier: string; chosen_name: string }
      | undefined,
  ): unknown {
    if (!nq) return nothing;
    let icon = "";
    let title = "";
    const pct = Math.round(nq.score * 100);
    switch (nq.tier) {
      case "mac_pattern":
        icon = "🆔";
        title =
          `MAC-pattern name (score ${pct}%). This entity needs ` +
          "identification — the name doesn't tell you what it is.";
        break;
      case "generic_domain":
        icon = "❓";
        title =
          `Generic entity_id (score ${pct}%). The name carries little ` +
          "signal; consider identifying the device.";
        break;
      case "mfr_model":
        icon = "🏷️";
        title =
          `Manufacturer + model (score ${pct}%). Better than a hex blob, ` +
          "but doesn't tell you which physical device it is.";
        break;
      case "user_override":
        icon = "✏️";
        title = `User-named (score ${pct}%). No identification needed.`;
        break;
      case "cloud":
        icon = "☁️";
        title =
          `Cloud-authoritative name (score ${pct}%). Imported from the ` +
          "integration's app — should match what you named it there.";
        break;
      case "friendly_set":
        // Skip the badge for friendly_set — it's the common case and
        // would clutter the list. The score-based sorting still
        // ranks it above mac_pattern / generic_domain.
        return nothing;
      default:
        return nothing;
    }
    return html`<span
      class="name-quality-badge name-quality-${nq.tier}"
      role="img"
      aria-label="${title}"
      title="${title}"
      >${icon}</span
    >`;
  }

  /** v1.6.0 — render the 🔆 identify button for one entity row.
   *
   *  Only renders when the integration says the entity supports an
   *  identify signal (flash_light / strobe_light / play_chime /
   *  siren_chirp / switch_toggle). For unsupported entities (passive
   *  sensors, etc.) returns nothing — Phase B perturbation testing
   *  is the future answer there.
   *
   *  Button state is per-entity (see `_identifyState`):
   *    idle    → 🔆 clickable
   *    pending → ⏳ disabled, "calling…"
   *    success → ✓ "<description>", auto-clears after 3 s
   *    failed  → ✗ "<error>", auto-clears after 3 s
   */
  private _renderIdentifyButton(entity_id: string): unknown {
    const cap = this._identifyCaps.get(entity_id);
    if (!cap || !cap.supported) return nothing;
    const st = this._identifyState.get(entity_id) ?? { status: "idle" };
    let label = "🔆";
    let title = `Identify: ${cap.description}`;
    let disabled = false;
    let cls = "identify-btn identify-btn-idle";
    switch (st.status) {
      case "pending":
        label = "⏳";
        title = "Sending identify…";
        disabled = true;
        cls = "identify-btn identify-btn-pending";
        break;
      case "success":
        label = "✓";
        title = st.message ?? cap.description;
        cls = "identify-btn identify-btn-success";
        break;
      case "failed":
        label = "✗";
        title = st.message ?? "Identify failed";
        cls = "identify-btn identify-btn-failed";
        break;
    }
    return html`<button
      class="${cls}"
      ?disabled=${disabled}
      aria-label="${title}"
      title="${title}"
      @click=${(e: Event) => {
        e.stopPropagation();
        void this._fireIdentify(entity_id);
      }}
    >
      ${label}
    </button>`;
  }

  /** v1.6.0 — call home_insights/identify_entity for one entity.
   *  Manages the per-entity lifecycle state map. */
  private async _fireIdentify(entity_id: string): Promise<void> {
    if (!this.hass) return;
    // Don't re-fire while a request is in flight for this entity.
    const current = this._identifyState.get(entity_id);
    if (current?.status === "pending") return;
    this._setIdentifyState(entity_id, { status: "pending" });
    try {
      const resp = await this.hass.connection.sendMessagePromise<{
        method: string;
        description: string;
        calls_made: number;
      }>({
        type: "home_insights/identify_entity",
        entity_id,
      });
      this._setIdentifyState(entity_id, {
        status: "success",
        message: `Done: ${resp.description} (${resp.calls_made} call${
          resp.calls_made === 1 ? "" : "s"
        })`,
      });
      // Auto-clear the success state after 3 s so the button is
      // clickable again if the user wants to try a second time
      // (e.g., they missed the flash).
      setTimeout(() => {
        const st = this._identifyState.get(entity_id);
        if (st?.status === "success") {
          this._setIdentifyState(entity_id, { status: "idle" });
        }
      }, 3000);
    } catch (err) {
      this._setIdentifyState(entity_id, {
        status: "failed",
        message: this._errMsg(err),
      });
      setTimeout(() => {
        const st = this._identifyState.get(entity_id);
        if (st?.status === "failed") {
          this._setIdentifyState(entity_id, { status: "idle" });
        }
      }, 3000);
    }
  }

  private _setIdentifyState(
    entity_id: string,
    state: { status: "idle" | "pending" | "success" | "failed"; message?: string },
  ): void {
    const next = new Map(this._identifyState);
    next.set(entity_id, state);
    this._identifyState = next;
  }

  /** v1.7.0 — render the 🔗 dedup pill for one entity row.
   *
   *  Surfaces when HA Insights v1.10.3+ reports a high-confidence
   *  (>= 0.7) same_as candidate — i.e. another HA entity that looks
   *  like the SAME physical device via static identifiers (MAC,
   *  Bluetooth, Zigbee IEEE, IP, identifier overlap).
   *
   *  Common scenarios this catches:
   *    - Tuya plug paired via Tuya cloud AND via BLE scanner
   *    - Govee Cloud + Govee BLE
   *    - Hue Bridge + Matter bridging the same Hue light
   *    - Shelly Cloud + local API
   *
   *  When you see the pill, the assignment you make to THIS entity
   *  should probably mirror to its `same_as` peer (and vice versa).
   *  The pill's tooltip shows the matching signal so the user can
   *  judge whether the dedup call is right (MAC = trust it; mfr +
   *  model + via_device = treat as a hint, verify before acting).
   *
   *  Cap: surface only the top candidate to keep the row compact.
   *  Detail dialog (future) can show the full list.
   */
  private _renderDedupPill(entity_id: string): unknown {
    const hints = this._dedupHints.get(entity_id);
    if (!hints || hints.length === 0) return nothing;
    // hints are pre-sorted server-side, descending by confidence.
    const top = hints[0];
    if (top.confidence < 0.7) return nothing;
    const otherLabel = this._shortEntityLabel(top.entity_id);
    const extraCount = hints.length - 1;
    const extraSuffix =
      extraCount > 0 ? ` (+ ${extraCount} other)` : "";
    const confPct = Math.round(top.confidence * 100);
    const title =
      `Looks like the same physical device as ${top.entity_id} ` +
      `— ${top.reason}, ${confPct}% confidence` +
      `${extraSuffix}. Assignments made here probably want to ` +
      "mirror to the linked entity (and vice versa).";
    return html`<span
      class="dedup-pill"
      role="img"
      aria-label="${title}"
      title="${title}"
      >🔗 ${otherLabel}${extraSuffix}</span
    >`;
  }

  /** Short label for inline display in the dedup pill.
   *  Prefer the entity's friendly name when we have it (via the
   *  entity registry); fall back to its entity_id object_id. */
  private _shortEntityLabel(entity_id: string): string {
    const e = this._entities.find((x) => x.entity_id === entity_id);
    if (e) {
      const lbl = e.name || e.original_name;
      if (lbl) return lbl;
    }
    const dot = entity_id.indexOf(".");
    return dot > 0 ? entity_id.slice(dot + 1) : entity_id;
  }

  // ===== v1.8.0 — touch-test (perturbation) =====

  /** Look up an entity's device_class from its live state attributes.
   *  Returns "" when no state or no device_class attribute. */
  private _deviceClassOf(entity_id: string): string {
    const state = this.hass?.states?.[entity_id];
    if (!state) return "";
    const dc = state.attributes?.device_class;
    return typeof dc === "string" ? dc.toLowerCase() : "";
  }

  /** Render the 👆 touch-test button next to the entity name.
   *
   *  Only renders when:
   *    - the entity has a device_class in the perturbable set
   *    - AND the entity is NOT identify-supported (otherwise 🔆 is
   *      the better affordance — no need for an alternative)
   *
   *  This is the v1.10 Phase B affordance: passive sensors that
   *  can't self-announce get user-driven perturbation testing
   *  instead, with the killer elimination outcome.
   */
  private _renderTouchTestButton(entity_id: string): unknown {
    const cap = this._identifyCaps.get(entity_id);
    if (cap?.supported) {
      // Identify is a stronger signal — skip the touch-test button.
      return nothing;
    }
    // v1.9.0 — prefer the server's authoritative `perturbable` field
    // (integration v1.10.7+). Fallback to the local hardcoded set
    // when paired with an older integration. Final fallback to "no
    // button" if neither the server nor a local check resolves.
    const dc = cap?.device_class ?? this._deviceClassOf(entity_id);
    const isPerturbable =
      cap?.perturbable !== undefined
        ? cap.perturbable
        : BulkAreaAssignDialog._PERTURBABLE_FALLBACK.has(dc);
    if (!isPerturbable) return nothing;
    // Keep the dc fallback for openTouchTest below — server didn't
    // tell us, but the local set says yes, so we have *some* class
    // to work with.
    if (!dc) return nothing;
    return html`<button
      class="touch-test-btn"
      aria-label="Touch test: physically perturb the sensor and see which entity spikes"
      title="Touch test: physically perturb the sensor and see which entity spikes"
      @click=${(e: Event) => {
        e.stopPropagation();
        void this._openTouchTest(entity_id, dc);
      }}
    >
      👆
    </button>`;
  }

  /** Open the touch-test modal for the clicked entity. Fetches the
   *  per-device_class guide so we can show the instruction + window
   *  before the user commits to Start. */
  private async _openTouchTest(
    entity_id: string,
    device_class: string,
  ): Promise<void> {
    if (!this.hass) return;
    this._touchTestEntity = entity_id;
    this._touchTestDeviceClass = device_class;
    this._touchTestGuide = null;
    this._touchTestResult = null;
    this._touchTestError = "";
    this._touchTestPhase = "loading_guide";
    this._touchTestCandidateCount = this._collectCandidates(device_class).length;
    this._touchTestOpen = true;
    try {
      const resp = await this.hass.connection.sendMessagePromise<{
        supported: boolean;
        instruction?: string;
        expected_delta?: number;
        listening_window_s?: number;
        perturb_duration_s?: number;
        reason?: string;
      }>({
        type: "home_insights/perturbation_guide",
        device_class,
      });
      if (!resp.supported) {
        this._touchTestPhase = "error";
        this._touchTestError =
          resp.reason ?? `device_class '${device_class}' isn't perturbable.`;
        return;
      }
      this._touchTestGuide = {
        instruction: resp.instruction ?? "",
        expected_delta: resp.expected_delta ?? 0,
        listening_window_s: resp.listening_window_s ?? 30,
        perturb_duration_s: resp.perturb_duration_s ?? 10,
      };
      this._touchTestPhase = "ready";
    } catch (err) {
      this._touchTestPhase = "error";
      this._touchTestError = this._errMsg(err);
    }
  }

  /** Collect all entities with the given device_class to use as
   *  candidates for the perturbation test. We test ALL of them so
   *  the elimination logic can fire — touching what the user
   *  thinks is X but a different entity spikes is THE moment. */
  private _collectCandidates(device_class: string): string[] {
    const out: string[] = [];
    for (const e of this._entities) {
      if (this._deviceClassOf(e.entity_id) === device_class) {
        out.push(e.entity_id);
      }
    }
    return out;
  }

  /** Fire the test. Starts a clientside countdown for UX and the
   *  WS request in parallel; they should complete at roughly the
   *  same time (server sleeps for window_s seconds). */
  private async _fireTouchTest(): Promise<void> {
    if (!this.hass || !this._touchTestGuide) return;
    const candidates = this._collectCandidates(this._touchTestDeviceClass);
    if (candidates.length === 0) {
      this._touchTestPhase = "error";
      this._touchTestError = `No candidates with device_class '${this._touchTestDeviceClass}'.`;
      return;
    }
    const window_s = this._touchTestGuide.listening_window_s;
    this._touchTestPhase = "running";
    this._touchTestCountdown = window_s;
    this._touchTestTimer = setInterval(() => {
      this._touchTestCountdown = Math.max(0, this._touchTestCountdown - 1);
      if (this._touchTestCountdown === 0 && this._touchTestTimer != null) {
        clearInterval(this._touchTestTimer);
        this._touchTestTimer = null;
      }
    }, 1000);
    try {
      const resp = await this.hass.connection.sendMessagePromise<{
        decision: "clear" | "ambiguous" | "no_signal";
        top_match: string | null;
        runner_up_gap: number | null;
        reason: string;
        candidates: Array<{
          entity_id: string;
          peak_delta: number;
          z_score: number;
          spike_detected: boolean;
        }>;
      }>({
        type: "home_insights/perturbation_test",
        device_class: this._touchTestDeviceClass,
        candidate_entity_ids: candidates,
        listening_window_s: window_s,
      });
      this._touchTestResult = resp;
      this._touchTestPhase = "done";
    } catch (err) {
      this._touchTestPhase = "error";
      this._touchTestError = this._errMsg(err);
    } finally {
      if (this._touchTestTimer != null) {
        clearInterval(this._touchTestTimer);
        this._touchTestTimer = null;
      }
    }
  }

  /** Close the modal + cancel any in-flight timer. */
  private _closeTouchTest(): void {
    if (this._touchTestTimer != null) {
      clearInterval(this._touchTestTimer);
      this._touchTestTimer = null;
    }
    this._touchTestOpen = false;
    this._touchTestResult = null;
    this._touchTestGuide = null;
    this._touchTestError = "";
  }

  /** Reset to "ready" so the user can run the test again without
   *  closing + reopening. Keeps the loaded guide. */
  private _retryTouchTest(): void {
    this._touchTestResult = null;
    this._touchTestError = "";
    if (this._touchTestTimer != null) {
      clearInterval(this._touchTestTimer);
      this._touchTestTimer = null;
    }
    this._touchTestPhase = "ready";
  }

  /** Render the touch-test modal. Phase-driven; renders only when
   *  `_touchTestOpen` is true. */
  private _renderTouchTestModal(): unknown {
    if (!this._touchTestOpen) return nothing;
    return html`
      <div
        class="touch-test-backdrop"
        @click=${this._closeTouchTest}
      >
        <div
          class="touch-test-modal"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="touch-test-header">
            <span class="touch-test-title">
              👆 Touch test: ${this._touchTestEntity}
            </span>
            <button
              class="touch-test-close"
              aria-label="Close"
              @click=${this._closeTouchTest}
            >
              ×
            </button>
          </div>
          <div class="touch-test-body">
            ${this._renderTouchTestPhase()}
          </div>
        </div>
      </div>
    `;
  }

  /** Per-phase body content. Switches on _touchTestPhase. */
  private _renderTouchTestPhase(): unknown {
    switch (this._touchTestPhase) {
      case "loading_guide":
        return html`<p>Loading instructions…</p>`;

      case "error":
        return html`
          <p class="touch-test-error">
            ⚠ ${this._touchTestError}
          </p>
          <div class="touch-test-actions">
            <button @click=${this._closeTouchTest}>Close</button>
          </div>
        `;

      case "ready": {
        const guide = this._touchTestGuide!;
        return html`
          <p>${guide.instruction}</p>
          <p class="touch-test-meta">
            Listening window: <b>${guide.listening_window_s}s</b> ·
            ${this._touchTestCandidateCount}
            ${this._touchTestDeviceClass}
            ${this._touchTestCandidateCount === 1 ? "sensor" : "sensors"}
            will be monitored.
          </p>
          <div class="touch-test-actions">
            <button class="primary" @click=${() => this._fireTouchTest()}>
              Start touch test
            </button>
            <button @click=${this._closeTouchTest}>Cancel</button>
          </div>
        `;
      }

      case "running": {
        const guide = this._touchTestGuide!;
        const elapsed = guide.listening_window_s - this._touchTestCountdown;
        const pct = Math.min(
          100,
          Math.round((elapsed / guide.listening_window_s) * 100),
        );
        return html`
          <p class="touch-test-prompt">
            🟢 <b>Touch the sensor now!</b>
          </p>
          <div class="touch-test-progress">
            <div
              class="touch-test-progress-fill"
              style="width: ${pct}%;"
            ></div>
          </div>
          <p class="touch-test-meta">
            ${this._touchTestCountdown}s remaining ·
            watching ${this._touchTestCandidateCount}
            ${this._touchTestDeviceClass}
            ${this._touchTestCandidateCount === 1 ? "sensor" : "sensors"}…
          </p>
        `;
      }

      case "done":
        return this._renderTouchTestResult();
    }
    return nothing;
  }

  /** Render the final result, with phase-aware copy for the
   *  elimination case (top_match != clicked entity). */
  private _renderTouchTestResult(): unknown {
    const result = this._touchTestResult;
    if (!result) return nothing;
    const clicked = this._touchTestEntity;

    if (result.decision === "no_signal") {
      return html`
        <p class="touch-test-no-signal">
          ❌ No clear spike detected.
        </p>
        <p class="touch-test-meta">${result.reason}</p>
        <div class="touch-test-actions">
          <button class="primary" @click=${() => this._retryTouchTest()}>
            Try again
          </button>
          <button @click=${this._closeTouchTest}>Close</button>
        </div>
      `;
    }

    if (result.decision === "ambiguous") {
      const spiked = result.candidates.filter((c) => c.spike_detected);
      return html`
        <p class="touch-test-ambiguous">
          ⚠ Multiple candidates spiked together.
        </p>
        <ul class="touch-test-candidate-list">
          ${spiked.map(
            (c) => html`
              <li>
                <b>${c.entity_id}</b>
                — z=${c.z_score.toFixed(1)},
                Δ=${c.peak_delta.toFixed(2)}
              </li>
            `,
          )}
        </ul>
        <p class="touch-test-meta">${result.reason}</p>
        <div class="touch-test-actions">
          <button class="primary" @click=${() => this._retryTouchTest()}>
            Try again
          </button>
          <button @click=${this._closeTouchTest}>Close</button>
        </div>
      `;
    }

    // decision === "clear"
    const top = result.candidates[0];
    if (result.top_match !== clicked) {
      // THE elimination moment.
      return html`
        <p class="touch-test-elimination">
          ⚠ Mislabel detected!
        </p>
        <p class="touch-test-elim-detail">
          You touched what was labelled <b>${clicked}</b>, but
          <b>${result.top_match}</b> actually spiked
          (z=${top.z_score.toFixed(1)},
          Δ=${top.peak_delta.toFixed(2)}).
        </p>
        <p class="touch-test-meta">
          These two entities are probably mislabeled — the physical
          sensor you touched is reported as
          <b>${result.top_match}</b>, not ${clicked}. Check the
          device names in HA and rename accordingly.
        </p>
        <div class="touch-test-actions">
          <button class="primary" @click=${() => this._retryTouchTest()}>
            Try again
          </button>
          <button @click=${this._closeTouchTest}>Close</button>
        </div>
      `;
    }

    // Clear match AND the user clicked the right entity.
    const unit = this._unitFor(result.top_match!);
    return html`
      <p class="touch-test-success">
        ✓ Clear match: <b>${result.top_match}</b>
      </p>
      <p class="touch-test-meta">
        Spiked Δ=${top.peak_delta.toFixed(2)}${unit ? " " + unit : ""}
        (z=${top.z_score.toFixed(1)}). ${result.reason}
      </p>
      <div class="touch-test-actions">
        <button class="primary" @click=${() => this._retryTouchTest()}>
          Run again
        </button>
        <button @click=${this._closeTouchTest}>Close</button>
      </div>
    `;
  }

  /** v1.9.0 — pull unit_of_measurement off the entity's live state.
   *  Returns "" when the entity has no state or no unit attribute.
   *  Reactive: if the user reconfigures the unit, the next render
   *  picks it up. */
  private _unitFor(entity_id: string): string {
    const state = this.hass?.states?.[entity_id];
    if (!state) return "";
    const u = state.attributes?.unit_of_measurement;
    return typeof u === "string" ? u : "";
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
    const filtered = this._entities.filter((e) => {
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
    // v1.5.0 — when HA Insights name_quality data is available,
    // sort worst-named entities to the top so the user attacks the
    // genuinely-confusing ones (BLE MACs, hex blobs) first. Entities
    // missing a score (no enrichment or not in the batch) sort to
    // the end so the high-quality entities don't crowd them out.
    // Stable secondary sort by entity_id keeps the order deterministic.
    if (this._nameQuality.size > 0) {
      filtered.sort((a, b) => {
        const sa = this._nameQuality.get(a.entity_id)?.score ?? 1.5;
        const sb = this._nameQuality.get(b.entity_id)?.score ?? 1.5;
        if (sa !== sb) return sa - sb;
        return a.entity_id.localeCompare(b.entity_id);
      });
    }
    return filtered;
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
    this._savedAssignments = [];
    const failed: string[] = [];
    const succeededKeys: string[] = [];
    const summary: Array<{ label: string; area_name: string }> = [];
    for (const [key, area_id] of this._pending.entries()) {
      const [kind, id] = key.split(":", 2);
      // v1.2.14: capture the human-readable label + area name BEFORE
      // the registry update succeeds, so the post-save summary can
      // show "Kitchen TV → Kitchen" rather than just an ID.
      const label = this._labelForKey(kind, id);
      const areaName = area_id
        ? this._areaNameById(area_id)
        : "(no area)";
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
        succeededKeys.push(key);
        summary.push({ label, area_name: areaName });
      } catch (err) {
        failed.push(`${label}: ${this._errMsg(err)}`);
      }
    }
    // v1.2.14: drop successfully-saved rows from _pending so the
    // "Save N changes" button reflects only the work still owed.
    // Pre-v1.2.14 the pending map was never cleared, so the button
    // re-armed itself forever and a second click would attempt to
    // re-save rows the registry already accepted.
    if (succeededKeys.length > 0) {
      const next = new Map(this._pending);
      for (const k of succeededKeys) next.delete(k);
      this._pending = next;
    }
    this._savedCount = summary.length;
    this._savedAssignments = summary;
    this._failedRows = failed;
    this._saving = false;
    // Refresh registries so the table reflects the saved state.
    // preserveSavedState=true keeps the success banner visible —
    // pre-v1.2.14 we wiped _savedCount inside _fetchRegistries, which
    // made the success banner flash and disappear immediately.
    await this._fetchRegistries({ preserveSavedState: true });
    // Emit so the host can refresh its own list / fire a scan.
    this.dispatchEvent(
      new CustomEvent("assignments-saved", {
        detail: { saved: summary.length, failed: failed.length },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** v1.2.14: friendly label for a pending row key, used in the
   *  post-save summary. Devices fall back to `<no name>` if HA gave
   *  us a device with neither name nor name_by_user. */
  private _labelForKey(kind: string, id: string): string {
    if (kind === "device") {
      const d = this._devices.find((x) => x.id === id);
      return (
        d?.name_by_user || d?.name || `<device ${id.slice(0, 8)}…>`
      );
    }
    if (kind === "entity") {
      const e = this._entities.find((x) => x.entity_id === id);
      return e?.name || id;
    }
    return id;
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
            : "Pick area…"}
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
        <colgroup>
          <col class="col-name" />
          <col class="col-meta" />
          <col class="col-current" />
          <col class="col-new" />
        </colgroup>
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
        <colgroup>
          <col class="col-name" />
          <col class="col-meta" />
          <col class="col-current" />
          <col class="col-new" />
        </colgroup>
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
            const nq = this._nameQuality.get(e.entity_id);
            return html`
              <tr>
                <td class="name">
                  <div>
                    ${this._renderNameQualityBadge(nq)}${this._entityLabel(e)}
                    ${this._renderIdentifyButton(e.entity_id)}
                    ${this._renderTouchTestButton(e.entity_id)}
                    ${this._renderDedupPill(e.entity_id)}
                  </div>
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
                  <div class="success-headline">
                    ✓ Saved ${this._savedCount} assignment${
                      this._savedCount === 1 ? "" : "s"
                    }.
                  </div>
                  ${this._savedAssignments.length > 0
                    ? html`<ul class="success-summary">
                        ${this._savedAssignments.map(
                          (a) => html`<li>
                            <span class="sa-label">${a.label}</span>
                            <span class="sa-arrow">→</span>
                            <span class="sa-area">${a.area_name}</span>
                          </li>`,
                        )}
                      </ul>`
                    : nothing}
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
      ${this._renderTouchTestModal()}
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
      table-layout: fixed;
    }
    /* v1.2.14: explicit column widths so the "New area" picker has
       room for "Pick area…" + the longest area name without truncating
       to "pick an are". Manufacturer column wraps text rather than
       eating the picker's column. */
    .col-name { width: 26%; }
    .col-meta { width: 30%; }
    .col-current { width: 14%; }
    .col-new { width: 30%; }
    td.meta {
      overflow: hidden;
      text-overflow: ellipsis;
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
    /* v1.5.0 — name_quality tier badge. Sits inline before the entity
     * label; tooltip carries score + reason. Low-quality tiers
     * (mac_pattern / generic_domain) get visual weight; high-quality
     * tiers (cloud / user_override) are subtle so they don't clutter. */
    .name-quality-badge {
      display: inline-block;
      margin-right: 6px;
      font-size: 0.95em;
      vertical-align: middle;
      cursor: help;
    }
    .name-quality-mac_pattern,
    .name-quality-generic_domain {
      filter: none;
      opacity: 1;
    }
    .name-quality-user_override,
    .name-quality-cloud,
    .name-quality-mfr_model {
      opacity: 0.55;
    }
    /* v1.6.0 — identify button. Small inline button; per-state color
     * swap gives clear feedback without claiming a row. */
    .identify-btn {
      margin-left: 8px;
      padding: 1px 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: var(--card-background-color, transparent);
      cursor: pointer;
      font-size: 0.9em;
      line-height: 1.4;
      vertical-align: middle;
    }
    .identify-btn:disabled {
      cursor: progress;
    }
    .identify-btn-idle:hover {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color, #03a9f4);
    }
    .identify-btn-success {
      background: var(--success-color, #4caf50);
      color: var(--text-primary-color, white);
      border-color: var(--success-color, #4caf50);
    }
    .identify-btn-failed {
      background: var(--error-color, #f44336);
      color: var(--text-primary-color, white);
      border-color: var(--error-color, #f44336);
    }
    .identify-btn-pending {
      opacity: 0.7;
    }
    /* v1.7.0 — dedup pill. Inline next to the entity label; tooltip
     * explains the matching signal and which entity it links to.
     * Visually quiet (no fill, no border accent) to avoid competing
     * with the name_quality badges and the identify button — this is
     * a HINT, not a primary action. */
    .dedup-pill {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 8px;
      border-radius: 10px;
      background: var(--secondary-background-color, #f5f5f5);
      color: var(--secondary-text-color);
      font-size: 0.85em;
      vertical-align: middle;
      cursor: help;
    }
    /* v1.8.0 — touch-test (perturbation) button + modal. */
    .touch-test-btn {
      margin-left: 8px;
      padding: 1px 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: var(--card-background-color, transparent);
      cursor: pointer;
      font-size: 0.9em;
      line-height: 1.4;
      vertical-align: middle;
    }
    .touch-test-btn:hover {
      background: var(--accent-color, #ff9800);
      color: var(--text-primary-color, white);
      border-color: var(--accent-color, #ff9800);
    }
    .touch-test-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      /* v1.9.0 — parent .backdrop is z-index 9999; touch-test modal
       * must stack above it or it renders BEHIND and is unclickable. */
      z-index: 10000;
    }
    .touch-test-modal {
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      border-radius: 8px;
      min-width: 420px;
      max-width: 520px;
      padding: 0;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }
    .touch-test-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .touch-test-title {
      font-weight: 600;
    }
    .touch-test-close {
      background: transparent;
      border: none;
      font-size: 1.4em;
      cursor: pointer;
      color: var(--secondary-text-color);
      line-height: 1;
    }
    .touch-test-body {
      padding: 18px;
    }
    .touch-test-body p {
      margin: 8px 0;
      line-height: 1.5;
    }
    .touch-test-meta {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .touch-test-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .touch-test-actions button {
      padding: 6px 14px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .touch-test-actions button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color, #03a9f4);
    }
    .touch-test-prompt {
      font-size: 1.1em;
      text-align: center;
    }
    .touch-test-progress {
      height: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
    }
    .touch-test-progress-fill {
      height: 100%;
      background: var(--primary-color, #03a9f4);
      transition: width 1s linear;
    }
    .touch-test-error {
      color: var(--error-color, #f44336);
    }
    .touch-test-success {
      color: var(--success-color, #4caf50);
      font-size: 1.1em;
    }
    .touch-test-no-signal {
      font-size: 1.05em;
    }
    .touch-test-ambiguous {
      color: var(--warning-color, #ff9800);
      font-size: 1.05em;
    }
    .touch-test-elimination {
      color: var(--warning-color, #ff9800);
      font-size: 1.2em;
      font-weight: 600;
    }
    .touch-test-elim-detail {
      font-size: 1.05em;
    }
    .touch-test-candidate-list {
      list-style: none;
      padding: 0;
      margin: 8px 0;
    }
    .touch-test-candidate-list li {
      padding: 4px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
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
    .success-headline {
      font-weight: 500;
    }
    .success-summary {
      margin: 8px 0 0 0;
      padding: 0;
      list-style: none;
      max-height: 200px;
      overflow-y: auto;
      font-size: 0.88em;
    }
    .success-summary li {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      border-top: 1px solid rgba(76, 175, 80, 0.15);
    }
    .success-summary li:first-child {
      border-top: none;
      margin-top: 4px;
    }
    .sa-label {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sa-arrow {
      color: var(--secondary-text-color);
    }
    .sa-area {
      flex: 1;
      color: var(--success-color, #2e7d32);
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

// v1.2.24: switched from `@customElement` decorator to guarded
// `customElements.define` to match the other three top-level elements
// in this bundle. The decorator throws on re-registration via the
// scoped-custom-element-registry polyfill, and HA re-mounts the panel
// on tab-return — the throw at module-eval time killed all subsequent
// code on the page, leaving the panel blank until a hard refresh.
// Wrapping in `customElements.get(...) ?? define(...)` makes the
// second module evaluation a no-op.
if (!customElements.get("bulk-area-assign-dialog")) {
  customElements.define("bulk-area-assign-dialog", BulkAreaAssignDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    "bulk-area-assign-dialog": BulkAreaAssignDialog;
  }
}
