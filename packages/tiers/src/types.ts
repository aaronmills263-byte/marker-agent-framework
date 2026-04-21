export enum Tier {
  Silent = 1,    // Logs action, no notification, no approval
  Notify = 2,    // Logs + sends notification, no approval required
  Approve = 3,   // Logs + notifies + requires approval before action executes
  Assist = 4,    // Logs + notifies + refuses to execute; human must do it
}

export interface TierConfig {
  tier: Tier;
  agentName: string;
  notificationChannels?: string[];  // e.g. ['log', 'email', 'slack'] — consumer provides implementations
  approvalCategories?: string[];    // for Tier 3, the allowlist of legitimate approval reasons
}

export interface TieredAction {
  type: 'file_write' | 'bash' | 'external_api' | 'social_post' | 'email_send';
  target: string;
  summary: string;
  payload?: unknown;
}

export interface TierDecision {
  action: TieredAction;
  tier: Tier;
  outcome: 'allowed' | 'pending_approval' | 'refused';
  reason?: string;
  approvalCategory?: string;
}

export interface NotificationHandler {
  notify(decision: TierDecision, config: TierConfig): Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  recommendedTier?: Tier;
}
