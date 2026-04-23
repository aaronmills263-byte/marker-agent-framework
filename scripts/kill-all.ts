/**
 * Emergency disable — kills all running Marker agents.
 * Usage: pnpm kill-all "reason here"
 */

import { killAll, status } from "@aaronmills263-byte/kill-switch";

const reason = process.argv[2];

if (!reason) {
  console.error("Usage: pnpm kill-all \"<reason>\"");
  process.exit(1);
}

const result = killAll(reason);
console.log(`[kill-all] Kill switch activated at ${result.timestamp.toISOString()}`);
console.log(`  Reason: ${result.reason}`);

const s = status();
console.log(`  Persisted state: killed=${s.killed}`);
