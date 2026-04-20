import * as fs from "node:fs";
import * as path from "node:path";

// MARMALADE: upgrade to Vercel KV or similar for distributed propagation across
// running processes. Current file-based state only works for single-machine contexts.

const STATE_DIR = path.join(process.env.HOME ?? "/tmp", ".marker");
const STATE_FILE = path.join(STATE_DIR, "kill-switch.state");

export interface KillSwitchStatus {
  killed: boolean;
  reason: string | null;
  lastChange: Date | null;
}

export interface KillResult {
  success: boolean;
  timestamp: Date;
  reason: string;
}

interface StateFileData {
  killed: boolean;
  reason: string;
  timestamp: string;
}

/**
 * Check whether the kill switch has been activated.
 *
 * Checks the MARKER_AGENTS_KILLED env var first (cheap, no I/O).
 * This is what every agent calls at runtime before taking any action.
 */
export function isKilled(): boolean {
  const envVal = process.env.MARKER_AGENTS_KILLED;
  return envVal === "1" || envVal === "true";
}

/**
 * Activate the kill switch for all agents.
 *
 * Sets the env var for the current process AND writes to the persistent
 * state file so the kill survives across shell sessions.
 */
export function killAll(reason: string): KillResult {
  const timestamp = new Date();

  // Set env var so current process sees change immediately
  process.env.MARKER_AGENTS_KILLED = "1";

  // Persist to state file
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const state: StateFileData = {
    killed: true,
    reason,
    timestamp: timestamp.toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");

  return { success: true, timestamp, reason };
}

/**
 * Reset the kill switch (re-enable agents).
 *
 * Clears the env var and removes the persistent state file.
 */
export function reset(reason: string): KillResult {
  const timestamp = new Date();

  // Clear env var
  delete process.env.MARKER_AGENTS_KILLED;

  // Remove state file
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }

  return { success: true, timestamp, reason };
}

/**
 * Read the persistent kill switch status from disk.
 *
 * Unlike isKilled() (which is env-var-based and cheap), this reads
 * the state file and returns full metadata.
 */
export function status(): KillSwitchStatus {
  if (!fs.existsSync(STATE_FILE)) {
    return { killed: false, reason: null, lastChange: null };
  }

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state: StateFileData = JSON.parse(raw);
    return {
      killed: state.killed,
      reason: state.reason,
      lastChange: new Date(state.timestamp),
    };
  } catch {
    return { killed: false, reason: null, lastChange: null };
  }
}

/** Path to the state file — exposed for testing cleanup. */
export const STATE_FILE_PATH = STATE_FILE;
