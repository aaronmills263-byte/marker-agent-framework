import * as crypto from "node:crypto";
import picomatch from "picomatch";
import { isKilled } from "@marker/kill-switch";
import { defaultMarkerRules, type HookRules } from "../rules.js";
import { LocalFileStorage, type AuditEntry } from "../audit.js";
import { loadConsumerRules } from "../config-loader.js";

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
  options: { bypass?: boolean; sessionId?: string; isTest?: boolean } = {},
): PreToolUseResult {
  const storage = new LocalFileStorage();
  const sessionId = options.sessionId ?? process.env.MARKER_SESSION_ID ?? "unknown";
  const isTest = options.isTest ?? process.env.MARKER_IS_TEST === "1";

  // HOOKS_BYPASS — allow but audit
  if (options.bypass || process.env.HOOKS_BYPASS === "1") {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      tool: input.tool_name,
      target: extractTarget(input),
      exitStatus: 0,
      sessionId,
      bypass: true,
      ...(isTest ? { isTest: true } : {}),
    };
    storage.append(entry).catch(() => {});
    return { exitCode: 0, message: "Bypassed (HOOKS_BYPASS=1)" };
  }

  // Kill switch check
  if (isKilled()) {
    return {
      exitCode: 2,
      message: "Agent infrastructure is killed. No tool calls permitted.",
    };
  }

  // Bash tool — check deny then warn patterns
  if (input.tool_name === "Bash") {
    const command = String(input.tool_input.command ?? "");
    return handleBashCheck(command, rules);
  }

  // Write or Edit tool — check protected and critical paths
  if (input.tool_name === "Write" || input.tool_name === "Edit") {
    const filePath = String(input.tool_input.file_path ?? input.tool_input.path ?? "");
    return handleWriteCheck(filePath, rules);
  }

  // All other tools — allow
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

function handleWriteCheck(filePath: string, rules: HookRules): PreToolUseResult {
  // Check protected paths — block with instruction to ask human
  for (const pattern of rules.protectedPaths) {
    const isMatch = picomatch(pattern);
    if (isMatch(filePath)) {
      return {
        exitCode: 2,
        message: `Blocked: ${filePath} matches protected path pattern "${pattern}". Ask the human for approval before modifying this file.`,
      };
    }
  }

  // Check audit-critical paths — don't block, but flag
  for (const pattern of rules.auditCriticalPaths) {
    const isMatch = picomatch(pattern);
    if (isMatch(filePath)) {
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
  const rules = await loadConsumerRules(process.cwd());

  const result = handlePreToolUse(input, rules, { sessionId });

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
