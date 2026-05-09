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
}

export interface RefineResult {
  refined_payload: Record<string, unknown>;
  rationale: string | null;
  diff_summary: string[];
  bytes_sent: number;
  bytes_received: number;
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
  action: "added" | "dismissed" | "snoozed" | "applied";
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
