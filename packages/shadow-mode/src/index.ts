export interface ShadowOutput {
  agentId: string;
  action: string;
  output: unknown;
  timestamp: Date;
}

export interface ShadowLog {
  outputs: ShadowOutput[];
}

/** Capture an agent's intended output without executing it. */
export function capture(agentId: string, action: string, output: unknown): ShadowOutput {
  const entry: ShadowOutput = {
    agentId,
    action,
    output,
    timestamp: new Date(),
  };
  // TODO: persist to shadow log
  return entry;
}

/** Retrieve shadow outputs for review. */
export function getLog(_agentId?: string): ShadowLog {
  // TODO: read from persistent shadow log
  return { outputs: [] };
}
