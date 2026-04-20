import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { isKilled, killAll, reset, status, STATE_FILE_PATH } from "./index.js";

describe("@marker/kill-switch", () => {
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
});
