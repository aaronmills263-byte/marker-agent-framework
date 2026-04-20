export interface KillSwitchStatus {
  killed: boolean;
  reason?: string;
  killedAt?: Date;
}

/** Check whether the kill switch has been activated. */
export function isKilled(): KillSwitchStatus {
  // TODO: check persistent kill-switch state
  return { killed: false };
}

/** Activate the kill switch for all agents. */
export function killAll(reason: string): void {
  // TODO: persist kill state
  console.log(`[kill-switch] killAll called: ${reason}`);
}

/** Reset the kill switch (re-enable agents). */
export function reset(): void {
  // TODO: clear kill state
  console.log("[kill-switch] reset called");
}
