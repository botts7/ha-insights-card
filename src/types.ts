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
  | "scene";

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
  /** v1.1: derived from fingerprint at WS-list time so panel chips can
   * filter by domain without re-querying. Null if no entity_id was in
   * the fingerprint (most insights have one). */
  domain?: string | null;
  /** v1.1: device_class looked up against the entity registry at
   * WS-list time. Null when no entity has a class (or the registry
   * lookup is unavailable). */
  device_class?: string | null;
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
  /** v0.7: render insights grouped under section headers. */
  group_by?: "area" | "detector" | "none";
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
