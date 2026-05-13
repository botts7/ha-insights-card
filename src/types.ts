/**
 * Types mirroring the Python Insight contract from the integration.
 * Stable from v0.1; new fields are appended, never removed.
 */

export type InsightKind =
  | "automation_proposal"
  | "card_proposal"
  | "group_proposal"
  | "anomaly"
  | "dashboard_cleanup"
  | "scene_proposal";

export type PayloadFormat =
  | "blueprint"
  | "automation"
  | "card"
  | "group"
  | "scene"
  | "report";

export interface Insight {
  id: string;
  kind: InsightKind;
  detector: string;
  area_id: string | null;
  title: string;
  confidence: number;
  fingerprint: Record<string, unknown>;
  payload: Record<string, unknown>;
  payload_format: PayloadFormat;
  created_at: string;
  snoozed_until: string | null;
  explanation: string | null;
  conflicts_with: string[];
  /** v0.8: ISO timestamp when the apply happened, or null if not applied. */
  applied_at?: string | null;
  applied_artifact_id?: string | null;
  /** v0.8: ISO timestamp the 7-day undo window expires. */
  undo_window_expires_at?: string | null;
  /** v1.4: detector maturity tier surfaced on every insight so the
   * card can render a 🟡 BETA / 🧪 EXPERIMENTAL pill. Optional
   * because pre-v1.4 stored insights don't carry it; default is
   * "stable" (no badge rendered). */
  maturity?: "stable" | "beta" | "experimental";
  /** v1.1: derived from fingerprint at WS-list time so panel chips can
   * filter by domain without re-querying. Null if no entity_id was in
   * the fingerprint (most insights have one). */
  domain?: string | null;
  /** v1.1: device_class looked up against the entity registry at
   * WS-list time. Null when no entity has a class (or the registry
   * lookup is unavailable). */
  device_class?: string | null;
  /** v1.1: list of existing-automation names/ids that reference any
   * of the entities in this insight. Looser than `conflicts_with` —
   * here it's "this entity is used somewhere in automation X" for
   * context. Empty list when none. Card surfaces as a small chip. */
  referenced_in_automations?: string[];
  /** v1.1: structured links for the conflicts_with pill — card renders
   * each as a clickable chip that opens the automation editor. */
  conflicts_with_links?: AutomationLink[];
  /** v1.1: structured links for the referenced_in_automations pill. */
  referenced_in_automations_links?: AutomationLink[];
  /** v1.1: when set, this entity is from an integration that commonly
   * carries DEVICE-side schedules (Tuya app, eWeLink app, Mi Home,
   * Roborock, PetKit, etc.) and no HA automation references it. Card
   * surfaces a "🏷️ managed externally" pill so the user knows we noticed
   * the pattern but suggesting a new HA automation would be wrong —
   * they already have the schedule in the vendor app. */
  external_source?: string | null;
  /** v1.1: full list of merged entity_ids when this insight is a
   * cohort representative (title has "(+N similar entities)" suffix).
   * Card uses this to render an expand/collapse toggle. */
  cohort_members?: string[];
  /** v1.1: friendly group label shown when expanding the cohort,
   * e.g. "binary_sensor.home_nvr_*" or "scene.evening_garden". */
  cohort_label?: string | null;
  /** v1.2 Phase 5: registry-derived axes for filter chips + group_by.
   * `area_id` overrides the legacy top-level `area_id` (same value;
   * Insight already carries it from the store). The other four are new.
   * All five may be null when the insight isn't pinned to a single
   * entity or the entity has no area / floor / integration. */
  area_name?: string | null;
  floor_id?: string | null;
  floor_name?: string | null;
  integration?: string | null;
}

export interface AutomationLink {
  /** Visible label (alias from automation YAML, or id if no alias). */
  alias: string;
  /** Automation ID — only present when the automation has one. */
  id?: string;
  /** Deep-link URL into HA's automation editor. Only present when id is set. */
  url?: string;
}

export type PrivacyMode = "off" | "local" | "cloud";

export interface HelloResult {
  integration_version: string;
  ws_protocol_version: number;
  supported_methods: string[];
  /** v0.2+: which privacy mode the user chose in the wizard. */
  privacy_mode?: PrivacyMode;
}

export interface ExplainResult {
  explanation: string;
  bytes_sent: number;
  bytes_received: number;
  /** v0.9 phase 7: agent that responded after failover. */
  chosen_agent_id?: string | null;
  /** v1.0 review #2: per-attempt audit rows. */
  attempts?: AttemptAudit[];
}

export interface AttemptAudit {
  /** Agent that handled this attempt. Null when HA's default agent
   * (no LLM Conversation entity installed) was used. */
  chosen_agent_id: string | null;
  bytes_sent: number;
  bytes_received: number;
  success: boolean;
}

export interface RefineResult {
  refined_payload: Record<string, unknown>;
  rationale: string | null;
  diff_summary: string[];
  bytes_sent: number;
  bytes_received: number;
  /** v1.0 RC #2: HA conversation_id from Conversation API. Threading
   * this back on follow-up Refines turns the exchange into a multi-turn
   * dialogue. Null when the agent didn't return one. */
  conversation_id?: string | null;
  /** v1.0 review #2: per-attempt audit rows when failover walked
   * multiple agents. The card can show "tried X, fell over to Y". */
  attempts?: AttemptAudit[];
  /** v0.9 phase 7: agent that actually responded after failover. */
  chosen_agent_id?: string | null;
}

export interface TestActionsResult {
  ran: number;
  error_count: number;
  results: Array<{
    index: number;
    ok: boolean;
    service?: string;
    error?: string;
    skipped?: boolean;
  }>;
}

export interface RedactionPreview {
  redacted_title: string;
  redacted_payload: Record<string, unknown>;
  entities_blocked: string[];
  pseudonym_map: Record<string, string>;
  attributes_stripped: string[];
  privacy_mode: string;
}

export interface AuditLogCall {
  id: number;
  timestamp: string;
  insight_id: string | null;
  insight_title: string | null;
  agent: string;
  agent_locality: string;
  redaction_mode: string;
  bytes_sent: number;
  bytes_received: number;
  success: boolean | null;
}

export interface BackfillStatus {
  running: boolean;
  last: {
    completed_at: string;
    events_added: number;
    entities_seen: number;
    events_skipped: number;
    duration_seconds: number;
    lookback_days: number;
    started_at: string;
  } | null;
}

/** Card-side state for an insight with a pending refined preview. */
export interface RefinedState {
  payload: Record<string, unknown>;
  rationale: string | null;
  diffSummary: string[];
}

export interface SubscribeEvent {
  /** v1.1: `purged` carries insight=null and means "drop entire local
   * list" — fired after ha_insights.purge_observations / Purge button. */
  action: "added" | "dismissed" | "snoozed" | "applied" | "undone" | "purged";
  insight: Insight | null;
}

export interface CardConfig {
  type: string;
  title?: string;
  /** Hide insights below this confidence threshold (0..1). */
  min_confidence?: number;
  /** Cap rendered rows. */
  max_rows?: number;
  /** v0.3: media_player to speak the LLM explanation through. Button only appears when set. */
  tts_target_entity_id?: string;
  /** v0.3: optional tts.* engine. If omitted, the card auto-picks the first tts.* entity. */
  tts_engine_entity_id?: string;
  /** v0.5: case-insensitive substring filter on insight.title. Empty/undefined = no filter. */
  search?: string;
  /**
   * v0.5: collapse the card to a single-line tile ("X insights -> ") that
   * deep-links to the /ha-insights panel. Useful when the dashboard wants
   * an at-a-glance summary instead of inline list interaction.
   */
  compact?: boolean;
  /** v0.7: list sort order. */
  sort_by?: "confidence" | "age" | "detector";
  /** v0.7: render insights grouped under section headers.
   *  v1.2 Phase 5 adds floor and integration. */
  group_by?: "area" | "floor" | "integration" | "detector" | "none";
  /** v0.8: include already-applied insights in the list (so Undo is reachable). */
  include_applied?: boolean;
  /** v1.1: panel-only filter chips. Each is a list of selected values;
   * empty / undefined = "no filter" (all values pass). The card filters
   * the loaded insight list client-side against these — no extra WS
   * calls. The dashboard card normally leaves these undefined; the
   * panel sets them from its own filter UI. */
  domain_filter?: string[];
  area_filter?: string[];
  device_class_filter?: string[];
  detector_filter?: string[];
  /** v1.2 Phase 5: filter by floor_id and integration platform. Same
   * shape as the others — empty / undefined means "no filter". */
  floor_filter?: string[];
  integration_filter?: string[];
  /** v1.2.1: override the integration's audit_analysis_depth setting
   *  for 🤖 Suggest calls fired from this card. Undefined = inherit
   *  the OptionsFlow value (defaults to "concise"). */
  audit_depth?: "concise" | "indepth";
}

/** Subset of the HA `hass` object the card uses. */
export interface HassLite {
  states?: Record<string, { state: string; attributes: Record<string, unknown> }>;
  connection: {
    sendMessagePromise: <T = unknown>(msg: { type: string; [key: string]: unknown }) => Promise<T>;
    subscribeMessage: <T = unknown>(
      callback: (msg: T) => void,
      msg: { type: string; [key: string]: unknown },
    ) => Promise<() => void>;
  };
}
