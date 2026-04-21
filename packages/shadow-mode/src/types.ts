export interface ShadowOutput {
  agentName: string;
  timestamp: Date;
  input: unknown;
  output: unknown;
  wouldHaveActioned: boolean;    // true if agent would have taken real action in prod
  actionDescription?: string;    // what it would have done
  metadata?: Record<string, unknown>;
}

export interface ShadowStorage {
  capture(output: ShadowOutput): Promise<void>;
  query(filter: { agentName?: string; since?: Date; until?: Date }): Promise<ShadowOutput[]>;
  count(agentName: string): Promise<number>;
}

export interface ShadowModeConfig {
  agentName: string;
  storage: ShadowStorage;
  graduationThreshold: number;   // minimum outputs reviewed before shadow mode can end (default 50 per brief)
}
