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
    return {
      timestamp: new Date().toISOString(),
      tool: "Bash",
      target: "echo hello",
      exitStatus: 0,
      sessionId: "test-session",
      ...overrides,
    };
  }

  it("append creates file and writes JSONL", async () => {
    await storage.append(makeEntry());
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, "utf-8").trim();
    const entry = JSON.parse(raw);
    expect(entry.tool).toBe("Bash");
  });

  it("append + query roundtrip", async () => {
    const entry1 = makeEntry({ tool: "Bash", target: "ls" });
    const entry2 = makeEntry({ tool: "Write", target: "file.ts" });
    const entry3 = makeEntry({ tool: "Bash", target: "echo hi", sessionId: "other" });

    await storage.append(entry1);
    await storage.append(entry2);
    await storage.append(entry3);

    // Query all
    const all = await storage.query({});
    expect(all).toHaveLength(3);

    // Filter by tool
    const bashOnly = await storage.query({ tool: "Bash" });
    expect(bashOnly).toHaveLength(2);

    // Filter by session
    const otherSession = await storage.query({ sessionId: "other" });
    expect(otherSession).toHaveLength(1);
    expect(otherSession[0].target).toBe("echo hi");

    // Limit
    const limited = await storage.query({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("query returns empty array when log does not exist", async () => {
    const result = await storage.query({});
    expect(result).toEqual([]);
  });

  it("query with since filter", async () => {
    const old = makeEntry({ timestamp: "2024-01-01T00:00:00.000Z" });
    const recent = makeEntry({ timestamp: "2026-06-01T00:00:00.000Z" });

    await storage.append(old);
    await storage.append(recent);

    const filtered = await storage.query({ since: new Date("2025-01-01") });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].timestamp).toBe("2026-06-01T00:00:00.000Z");
  });
});
