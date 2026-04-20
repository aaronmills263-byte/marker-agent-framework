/**
 * Weekly drill — verifies the kill switch works end-to-end.
 * Usage: pnpm drill-kill-switch
 */

import * as readline from "node:readline";
import { killAll, isKilled, reset, status } from "@marker/kill-switch";

async function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Press Enter to confirm you've seen the kill effect...", () => {
      rl.close();
      resolve();
    });
  });
}

async function main(): Promise<void> {
  console.log("=== Kill Switch Drill ===\n");

  // Step 1: Activate
  console.log("1. Activating kill switch...");
  const killResult = killAll("drill");
  console.log(`   Result: killed at ${killResult.timestamp.toISOString()}`);

  // Step 2: Verify killed
  console.log("2. Verifying isKilled()...");
  const killedCheck = isKilled();
  if (!killedCheck) {
    console.error("   FAIL: isKilled() returned false after killAll()");
    process.exit(1);
  }
  console.log("   PASS: isKilled() returns true");

  // Step 3: Verify status
  const s = status();
  console.log(`   Status: killed=${s.killed}, reason=${s.reason}`);

  // Step 4: Wait for human confirmation
  console.log("\n3. Kill switch is active. Verify agents are stopped.");
  await waitForEnter();

  // Step 5: Reset
  console.log("4. Resetting kill switch...");
  reset("drill complete");

  // Step 6: Verify reset
  console.log("5. Verifying isKilled() after reset...");
  const resetCheck = isKilled();
  if (resetCheck) {
    console.error("   FAIL: isKilled() returned true after reset()");
    process.exit(1);
  }
  console.log("   PASS: isKilled() returns false");

  // Report
  console.log("\n=== Drill Report ===");
  console.log("  Kill:  PASS");
  console.log("  Reset: PASS");
  console.log("  Drill complete.\n");
}

main().catch((err) => {
  console.error("Drill failed:", err);
  // Always try to reset if drill fails
  reset("drill failed — emergency reset");
  process.exit(1);
});
