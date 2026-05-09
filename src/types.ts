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
}

/** Subset of the HA `hass` object the card uses. */
export interface HassLite {
  connection: {
    sendMessagePromise: <T = unknown>(msg: { type: string; [key: string]: unknown }) => Promise<T>;
    subscribeMessage: <T = unknown>(
      callback: (msg: T) => void,
      msg: { type: string; [key: string]: unknown },
    ) => Promise<() => void>;
  };
}
