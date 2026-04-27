import * as fs from "node:fs";
import * as path from "node:path";

export interface AuditEntry {
  timestamp: string;
  callId: string; // sessionId + ":" + timestamp — pairs pre/post entries
  phase: "pre" | "post";
  tool: string;
  target: string;
  sessionId: string;
  // Pre-hook fields
  preHookDecision?: "allowed" | "blocked" | "critical-path" | "bypassed" | "killed";
  blockReason?: string;
  // Post-hook fields
  exitStatus?: number;
  diffHash?: string;
  actuallyExecuted?: boolean; // false if pre-hook blocked, derived from exit_status presence
  // Existing optional fields
  bypass?: boolean;
  warning?: string;
  isTest?: boolean;
  auditFlags?: { isCriticalPath?: boolean; warning?: string };
}

export interface AuditFilter {
  tool?: string;
  sessionId?: string;
  since?: Date;
  limit?: number;
  includeTests?: boolean;
}

export interface AuditStorage {
  append(entry: AuditEntry): void;
  query(filter: AuditFilter): AuditEntry[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// MARMALADE: swap for SupabaseAuditStorage or S3AuditStorage
export class LocalFileStorage implements AuditStorage {
  private logPath: string;

  constructor(logPath?: string) {
    const dir = path.join(process.env.HOME ?? "/tmp", ".marker");
    this.logPath = logPath ?? process.env.MARKER_AUDIT_LOG_PATH ?? path.join(dir, "audit.log");
  }

  append(entry: AuditEntry): void {
    const dir = path.dirname(this.logPath);
    fs.mkdirSync(dir, { recursive: true });

    this.rotateIfNeeded();

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.logPath, line, "utf-8");
  }

  query(filter: AuditFilter): AuditEntry[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const raw = fs.readFileSync(this.logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);

    let entries: AuditEntry[] = lines.map((line) => JSON.parse(line));

    // Exclude test entries by default unless explicitly included
    if (!filter.includeTests) {
      entries = entries.filter((e) => !e.isTest);
    }

    if (filter.tool) {
      entries = entries.filter((e) => e.tool === filter.tool);
    }
    if (filter.sessionId) {
      entries = entries.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter.since) {
      const since = filter.since.toISOString();
      entries = entries.filter((e) => e.timestamp >= since);
    }
    if (filter.limit) {
      entries = entries.slice(-filter.limit);
    }

    return entries;
  }

  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.logPath)) return;

    const stat = fs.statSync(this.logPath);
    if (stat.size < MAX_FILE_SIZE) return;

    // Find next rotation number
    const dir = path.dirname(this.logPath);
    const base = path.basename(this.logPath);
    let n = 1;
    while (fs.existsSync(path.join(dir, `${base}.${n}`))) {
      n++;
    }

    fs.renameSync(this.logPath, path.join(dir, `${base}.${n}`));
  }
}
