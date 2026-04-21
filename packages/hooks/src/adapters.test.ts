import { describe, it, expect } from "vitest";
import { toClaudeCodeSettings } from "./adapters.js";
import { defaultMarkerRules } from "./rules.js";

describe("toClaudeCodeSettings", () => {
  const hooksDir = "/tmp/test-repo/.marker/hooks";

  it("emits the matcher-based schema that Claude Code requires", () => {
    const settings = toClaudeCodeSettings(defaultMarkerRules, hooksDir);

    // Top-level has a hooks object
    expect(settings).toHaveProperty("hooks");
    expect(settings.hooks).toHaveProperty("PreToolUse");
    expect(settings.hooks).toHaveProperty("PostToolUse");

    // Each event is an array of { matcher, hooks } entries
    for (const event of ["PreToolUse", "PostToolUse"] as const) {
      const entries = settings.hooks[event];
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(1);

      for (const entry of entries) {
        // matcher with tools array
        expect(entry).toHaveProperty("matcher");
        expect(entry.matcher).toHaveProperty("tools");
        expect(Array.isArray(entry.matcher.tools)).toBe(true);
        expect(entry.matcher.tools).toEqual(["Write", "Edit", "Bash"]);

        // nested hooks array with type and command
        expect(entry).toHaveProperty("hooks");
        expect(Array.isArray(entry.hooks)).toBe(true);
        for (const hook of entry.hooks) {
          expect(hook).toHaveProperty("type", "command");
          expect(hook).toHaveProperty("command");
          expect(typeof hook.command).toBe("string");
        }
      }
    }
  });

  it("uses the provided absolute hooksDir in command paths", () => {
    const settings = toClaudeCodeSettings(defaultMarkerRules, hooksDir);

    const preCmd = settings.hooks.PreToolUse[0].hooks[0].command;
    const postCmd = settings.hooks.PostToolUse[0].hooks[0].command;

    expect(preCmd).toBe(`${hooksDir}/pretooluse.sh`);
    expect(postCmd).toBe(`${hooksDir}/posttooluse.sh`);
  });

  it("rejects relative paths", () => {
    expect(() =>
      toClaudeCodeSettings(defaultMarkerRules, ".marker/hooks"),
    ).toThrow("absolute");
  });
});
