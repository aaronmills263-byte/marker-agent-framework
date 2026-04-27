import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { LocalFileStorage, type AuditEntry } from "./audit.js";

describe("LocalFileStorage", () => {
  let tmpDir: string;
  let logPath: string;
  let storage: LocalFileStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marker-audit-test-"));
    logPath = path.join(tmpDir, "audit.log");
    storage = new LocalFileStorage(logPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      callId: `test-session:${timestamp}`,
      phase: "post",
      tool: "Bash",
      target: "echo hello",
      exitStatus: 0,
      sessionId: "test-session",
      ...overrides,
    };
  }

  it("append creates file and writes JSONL", () => {
    storage.append(makeEntry());
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, "utf-8").trim();
    const entry = JSON.parse(raw);
    expect(entry.tool).toBe("Bash");
  });

  it("append + query roundtrip", () => {
    const entry1 = makeEntry({ tool: "Bash", target: "ls" });
    const entry2 = makeEntry({ tool: "Write", target: "file.ts" });
    const entry3 = makeEntry({ tool: "Bash", target: "echo hi", sessionId: "other" });

    storage.append(entry1);
    storage.append(entry2);
    storage.append(entry3);

    // Query all
    const all = storage.query({});
    expect(all).toHaveLength(3);

    // Filter by tool
    const bashOnly = storage.query({ tool: "Bash" });
    expect(bashOnly).toHaveLength(2);

    // Filter by session
    const otherSession = storage.query({ sessionId: "other" });
    expect(otherSession).toHaveLength(1);
    expect(otherSession[0].target).toBe("echo hi");

    // Limit
    const limited = storage.query({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("query returns empty array when log does not exist", () => {
    const result = storage.query({});
    expect(result).toEqual([]);
  });

  it("query excludes test entries by default", () => {
    storage.append(makeEntry({ tool: "Bash", target: "ls" }));
    storage.append(makeEntry({ tool: "Write", target: "file.ts", isTest: true }));
    storage.append(makeEntry({ tool: "Bash", target: "echo hi" }));

    // Default query excludes test entries
    const results = storage.query({});
    expect(results).toHaveLength(2);
    expect(results.every((e) => !e.isTest)).toBe(true);

    // includeTests: true returns all entries
    const all = storage.query({ includeTests: true });
    expect(all).toHaveLength(3);
  });

  it("query with since filter", () => {
    const old = makeEntry({ timestamp: "2024-01-01T00:00:00.000Z" });
    const recent = makeEntry({ timestamp: "2026-06-01T00:00:00.000Z" });

    storage.append(old);
    storage.append(recent);

    const filtered = storage.query({ since: new Date("2025-01-01") });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].timestamp).toBe("2026-06-01T00:00:00.000Z");
  });
});
