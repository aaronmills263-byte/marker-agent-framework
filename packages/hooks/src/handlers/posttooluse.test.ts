import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { handlePostToolUse, type PostToolUseInput } from "./posttooluse.js";
import { LocalFileStorage } from "../audit.js";

describe("PostToolUse handler", () => {
  let tmpDir: string;
  let logPath: string;
  let storage: LocalFileStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marker-test-"));
    logPath = path.join(tmpDir, "audit.log");
    storage = new LocalFileStorage(logPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a well-formed JSONL entry for Bash", async () => {
    const input: PostToolUseInput = {
      tool_name: "Bash",
      tool_input: { command: "ls -la" },
      tool_output: "total 0\ndrwxr-xr-x  3 user staff 96 Jan 1 00:00 .\n",
      exit_status: 0,
    };

    await handlePostToolUse(input, { sessionId: "test-session", storage });

    const raw = fs.readFileSync(logPath, "utf-8").trim();
    const entry = JSON.parse(raw);

    expect(entry.tool).toBe("Bash");
    expect(entry.target).toBe("ls -la");
    expect(entry.exitStatus).toBe(0);
    expect(entry.sessionId).toBe("test-session");
    expect(entry.timestamp).toBeTruthy();
    expect(entry.diffHash).toBeTruthy();
    expect(entry.diffHash).toHaveLength(16);
  });

  it("writes a well-formed JSONL entry for Write", async () => {
    const input: PostToolUseInput = {
      tool_name: "Write",
      tool_input: { file_path: "src/index.ts" },
      tool_output: "File written",
      exit_status: 0,
    };

    await handlePostToolUse(input, { sessionId: "test-session", storage });

    const raw = fs.readFileSync(logPath, "utf-8").trim();
    const entry = JSON.parse(raw);

    expect(entry.tool).toBe("Write");
    expect(entry.target).toBe("src/index.ts");
  });

  it("handles missing tool_output gracefully", async () => {
    const input: PostToolUseInput = {
      tool_name: "Read",
      tool_input: { file_path: "README.md" },
    };

    await handlePostToolUse(input, { sessionId: "test-session", storage });

    const raw = fs.readFileSync(logPath, "utf-8").trim();
    const entry = JSON.parse(raw);

    expect(entry.diffHash).toBeUndefined();
  });

  it("appends multiple entries as JSONL", async () => {
    await handlePostToolUse(
      { tool_name: "Bash", tool_input: { command: "echo 1" }, exit_status: 0 },
      { sessionId: "s1", storage },
    );
    await handlePostToolUse(
      { tool_name: "Bash", tool_input: { command: "echo 2" }, exit_status: 0 },
      { sessionId: "s1", storage },
    );

    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);

    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
