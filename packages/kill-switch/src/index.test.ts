import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { isKilled, killAll, reset, status, STATE_FILE_PATH } from "./index.js";

// Child processes use the compiled JS (not vitest's TS transform)
const DIST_INDEX = path.resolve(__dirname, "../dist/index.js");

describe("@aaronmills263-byte/kill-switch", () => {
  beforeEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
    if (fs.existsSync(STATE_FILE_PATH)) {
      fs.unlinkSync(STATE_FILE_PATH);
    }
  });

  afterEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
    if (fs.existsSync(STATE_FILE_PATH)) {
      fs.unlinkSync(STATE_FILE_PATH);
    }
  });

  describe("isKilled", () => {
    it("returns false when env var is not set", () => {
      expect(isKilled()).toBe(false);
    });

    it('returns true when env var is "1"', () => {
      process.env.MARKER_AGENTS_KILLED = "1";
      expect(isKilled()).toBe(true);
    });

    it('returns true when env var is "true"', () => {
      process.env.MARKER_AGENTS_KILLED = "true";
      expect(isKilled()).toBe(true);
    });

    it('returns false when env var is "0"', () => {
      process.env.MARKER_AGENTS_KILLED = "0";
      expect(isKilled()).toBe(false);
    });

    it('returns false when env var is "false"', () => {
      process.env.MARKER_AGENTS_KILLED = "false";
      expect(isKilled()).toBe(false);
    });

    it("returns false for arbitrary string values", () => {
      process.env.MARKER_AGENTS_KILLED = "yes";
      expect(isKilled()).toBe(false);
    });
  });

  describe("killAll + isKilled roundtrip", () => {
    it("sets env var so isKilled returns true in same process", () => {
      expect(isKilled()).toBe(false);
      killAll("test kill");
      expect(isKilled()).toBe(true);
    });

    it("returns a KillResult with success and reason", () => {
      const result = killAll("emergency");
      expect(result.success).toBe(true);
      expect(result.reason).toBe("emergency");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("persists state to file", () => {
      killAll("persist test");
      expect(fs.existsSync(STATE_FILE_PATH)).toBe(true);
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const state = JSON.parse(raw);
      expect(state.killed).toBe(true);
      expect(state.reason).toBe("persist test");
    });
  });

  describe("status", () => {
    it("returns killed=false when no state file exists", () => {
      const s = status();
      expect(s.killed).toBe(false);
      expect(s.reason).toBeNull();
      expect(s.lastChange).toBeNull();
    });

    it("returns correct data after killAll", () => {
      killAll("status test");
      const s = status();
      expect(s.killed).toBe(true);
      expect(s.reason).toBe("status test");
      expect(s.lastChange).toBeInstanceOf(Date);
    });

    it("returns killed=false after reset", () => {
      killAll("to be reset");
      reset("done");
      const s = status();
      expect(s.killed).toBe(false);
      expect(s.reason).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears env var and state file", () => {
      killAll("to reset");
      expect(isKilled()).toBe(true);
      expect(fs.existsSync(STATE_FILE_PATH)).toBe(true);

      reset("test reset");
      expect(isKilled()).toBe(false);
      expect(fs.existsSync(STATE_FILE_PATH)).toBe(false);
    });

    it("returns a KillResult", () => {
      const result = reset("cleanup");
      expect(result.success).toBe(true);
      expect(result.reason).toBe("cleanup");
    });
  });

  describe("isKilled — state file fallback (in-process)", () => {
    it("returns true from state file when env var is absent", () => {
      killAll("file-only test");
      delete process.env.MARKER_AGENTS_KILLED;
      // env var gone, but state file still exists
      expect(isKilled()).toBe(true);
    });

    it("returns false when state file is malformed", () => {
      fs.mkdirSync(require("node:path").dirname(STATE_FILE_PATH), {
        recursive: true,
      });
      fs.writeFileSync(STATE_FILE_PATH, "NOT JSON", "utf-8");
      expect(isKilled()).toBe(false);
    });
  });

  describe("isKilled — cross-process behaviour", () => {
    function runChildIsKilled(env: NodeJS.ProcessEnv): Promise<string> {
      return new Promise((resolve) => {
        const child = spawn(
          process.execPath,
          [
            "-e",
            `const { isKilled } = require("${DIST_INDEX.replace(/\\/g, "/")}");
             console.log(isKilled() ? "KILLED" : "ALIVE");`,
          ],
          { env },
        );
        let stdout = "";
        child.stdout.on("data", (chunk: Buffer) => (stdout += chunk));
        child.on("close", () => resolve(stdout.trim()));
      });
    }

    it("child process sees killed=true via state file when env var didn't propagate", async () => {
      killAll("regression test for cross-process");
      expect(isKilled()).toBe(true);

      // Spawn child WITHOUT inheriting MARKER_AGENTS_KILLED
      const cleanEnv = { ...process.env };
      delete cleanEnv.MARKER_AGENTS_KILLED;

      const result = await runChildIsKilled(cleanEnv);
      expect(result).toBe("KILLED");
    });

    it("child process sees killed=false after reset", async () => {
      killAll("temp");
      reset("test cleanup");
      expect(isKilled()).toBe(false);

      const cleanEnv = { ...process.env };
      delete cleanEnv.MARKER_AGENTS_KILLED;

      const result = await runChildIsKilled(cleanEnv);
      expect(result).toBe("ALIVE");
    });
  });
});
