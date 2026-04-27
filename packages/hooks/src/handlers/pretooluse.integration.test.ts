import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Production-topology regression test for Incident #13.
 *
 * Spawns a child node process that runs the pretooluse CLI handler,
 * then verifies the audit entry exists on disk AFTER the child exits.
 * This catches the fire-and-forget async bug where process.exit() kills
 * the node process before the audit write completes.
 */
describe("audit log persists across process exit (Incident #13 regression)", () => {
  let tempLogPath: string;

  beforeEach(() => {
    tempLogPath = path.join(os.tmpdir(), `marker-audit-test-${Date.now()}.log`);
  });

  afterEach(() => {
    if (fs.existsSync(tempLogPath)) fs.unlinkSync(tempLogPath);
  });

  it("CLI invocation writes audit entry before process exits", (done) => {
    const handlerPath = path.resolve(__dirname, "../../../dist/handlers/pretooluse-cli.js");

    // Blocked write to .env — should produce a "blocked" audit entry
    const input = JSON.stringify({
      session_id: "regression-test-13",
      tool_name: "Write",
      tool_input: { file_path: ".env" },
    });

    const child = spawn(process.execPath, [handlerPath], {
      env: {
        ...process.env,
        MARKER_AUDIT_LOG_PATH: tempLogPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin.write(input);
    child.stdin.end();

    child.on("close", (code) => {
      try {
        // Pre-hook should have blocked with exit code 2
        expect(code).toBe(2);

        // After child exits, audit entry should be on disk
        expect(fs.existsSync(tempLogPath)).toBe(true);
        const contents = fs.readFileSync(tempLogPath, "utf-8");
        expect(contents).toContain("regression-test-13");
        expect(contents).toContain("blocked");
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});
