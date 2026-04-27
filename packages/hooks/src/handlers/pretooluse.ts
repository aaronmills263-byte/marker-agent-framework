import * as crypto from "node:crypto";
import * as path from "node:path";
import picomatch from "picomatch";
import { isKilled } from "@aaronmills263-byte/kill-switch";
import { defaultMarkerRules, type HookRules } from "../rules.js";
import { LocalFileStorage, type AuditEntry } from "../audit.js";
import { loadConsumerRules, findConsumerRoot } from "../config-loader.js";

export interface ToolCallInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface PreToolUseResult {
  exitCode: number;
  message?: string;
  auditFlags?: {
    isCriticalPath?: boolean;
    warning?: string;
  };
}

/**
 * PreToolUse handler — invoked before every tool call.
 *
 * Exit codes:
 *   0 = allow
 *   2 = block (tool call is rejected)
 */
export function handlePreToolUse(
  input: ToolCallInput,
  rules: HookRules = defaultMarkerRules,
  options: { bypass?: boolean; sessionId?: string; isTest?: boolean; consumerRoot?: string } = {},
): PreToolUseResult {
  const consumerRoot = options.consumerRoot ?? process.cwd();
  const storage = new LocalFileStorage();
  const sessionId = options.sessionId ?? process.env.MARKER_SESSION_ID ?? "unknown";
  const isTest = options.isTest ?? process.env.MARKER_IS_TEST === "1";

  const timestamp = new Date().toISOString();
  const callId = `${sessionId}:${timestamp}`;
  const target = extractTarget(input);

  function writePreAudit(decision: AuditEntry["preHookDecision"], extra: Partial<AuditEntry> = {}): void {
    const entry: AuditEntry = {
      timestamp,
      callId,
      phase: "pre",
      tool: input.tool_name,
      target,
      sessionId,
      preHookDecision: decision,
      ...(isTest ? { isTest: true } : {}),
      ...extra,
    };
    try {
      storage.append(entry);
    } catch {
      // Silently degrade — audit failure should not crash hook
    }
  }

  // HOOKS_BYPASS — allow but audit
  if (options.bypass || process.env.HOOKS_BYPASS === "1") {
    writePreAudit("bypassed", { bypass: true });
    return { exitCode: 0, message: "Bypassed (HOOKS_BYPASS=1)" };
  }

  // Kill switch check
  if (isKilled()) {
    writePreAudit("killed", { blockReason: "Kill switch active" });
    return {
      exitCode: 2,
      message: "Agent infrastructure is killed. No tool calls permitted.",
    };
  }

  // Bash tool — check deny then warn patterns
  if (input.tool_name === "Bash") {
    const command = String(input.tool_input.command ?? "");
    const result = handleBashCheck(command, rules);
    if (result.exitCode === 2) {
      writePreAudit("blocked", { blockReason: result.message });
    } else if (result.auditFlags?.warning) {
      writePreAudit("allowed", { auditFlags: result.auditFlags });
    } else {
      writePreAudit("allowed");
    }
    return result;
  }

  // Write or Edit tool — check protected and critical paths
  if (input.tool_name === "Write" || input.tool_name === "Edit") {
    const filePath = String(input.tool_input.file_path ?? input.tool_input.path ?? "");
    const result = handleWriteCheck(filePath, rules, consumerRoot);
    if (result.exitCode === 2) {
      writePreAudit("blocked", { blockReason: result.message });
    } else if (result.auditFlags?.isCriticalPath) {
      writePreAudit("critical-path", { auditFlags: result.auditFlags });
    } else {
      writePreAudit("allowed");
    }
    return result;
  }

  // All other tools — allow
  writePreAudit("allowed");
  return { exitCode: 0 };
}

function handleBashCheck(command: string, rules: HookRules): PreToolUseResult {
  // Check deny patterns
  for (const pattern of rules.bashDenyPatterns) {
    if (pattern.test(command)) {
      return {
        exitCode: 2,
        message: `Blocked: command matches deny pattern ${pattern}`,
      };
    }
  }

  // Check warn patterns
  for (const pattern of rules.bashWarnPatterns) {
    if (pattern.test(command)) {
      return {
        exitCode: 0,
        auditFlags: {
          warning: `Command matches warn pattern ${pattern}`,
        },
      };
    }
  }

  return { exitCode: 0 };
}

function normalizePath(filePath: string, consumerRoot: string): string {
  if (path.isAbsolute(filePath)) {
    const relative = path.relative(consumerRoot, filePath);
    // If the file is outside consumer root, keep absolute
    if (relative.startsWith("..")) {
      return filePath;
    }
    return relative;
  }
  return filePath;
}

function handleWriteCheck(filePath: string, rules: HookRules, consumerRoot: string): PreToolUseResult {
  const normalizedPath = normalizePath(filePath, consumerRoot);

  // Check protected paths — block with instruction to ask human
  for (const pattern of rules.protectedPaths) {
    const isMatch = picomatch(pattern);
    if (isMatch(normalizedPath)) {
      return {
        exitCode: 2,
        message: `Blocked: ${filePath} matches protected path pattern "${pattern}". Ask the human for approval before modifying this file.`,
      };
    }
  }

  // Check audit-critical paths — don't block, but flag
  for (const pattern of rules.auditCriticalPaths) {
    const isMatch = picomatch(pattern);
    if (isMatch(normalizedPath)) {
      return {
        exitCode: 0,
        auditFlags: {
          isCriticalPath: true,
        },
      };
    }
  }

  return { exitCode: 0 };
}

function extractTarget(input: ToolCallInput): string {
  if (input.tool_name === "Bash") {
    return String(input.tool_input.command ?? "");
  }
  if (input.tool_name === "Write" || input.tool_name === "Edit") {
    return String(input.tool_input.file_path ?? input.tool_input.path ?? "");
  }
  return input.tool_name;
}

/**
 * CLI entry point — reads tool call JSON from stdin.
 * Loads consumer .marker/config.ts if present, extracts session_id from payload.
 */
export async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[marker-hooks] Failed to parse stdin as JSON");
    process.exit(0); // don't block on parse failure
    return;
  }

  const input: ToolCallInput = {
    tool_name: String(parsed.tool_name ?? ""),
    tool_input: (parsed.tool_input as Record<string, unknown>) ?? {},
  };

  // Extract session_id from the JSON payload if present
  const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : undefined;

  // Load consumer config from .marker/config.ts (falls back to defaults)
  const consumerRoot = findConsumerRoot(process.cwd()) ?? process.cwd();
  const rules = await loadConsumerRules(consumerRoot);

  const result = handlePreToolUse(input, rules, { sessionId, consumerRoot });

  if (result.message) {
    if (result.exitCode === 0) {
      console.error(`[marker-hooks] ${result.message}`);
    } else {
      // Output block reason to stdout so Claude sees it
      console.log(result.message);
    }
  }

  process.exit(result.exitCode);
}
