import * as crypto from "node:crypto";
import { LocalFileStorage, type AuditEntry } from "../audit.js";

export interface PostToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  exit_status?: number;
}

/**
 * PostToolUse handler — fires after every tool call completes.
 * Appends a JSONL audit entry. Never blocks.
 */
export async function handlePostToolUse(
  input: PostToolUseInput,
  options: { sessionId?: string; storage?: LocalFileStorage; isTest?: boolean } = {},
): Promise<void> {
  const storage = options.storage ?? new LocalFileStorage();
  const sessionId = options.sessionId ?? process.env.MARKER_SESSION_ID ?? "unknown";
  const isTest = options.isTest ?? process.env.MARKER_IS_TEST === "1";

  const target = extractTarget(input);
  const timestamp = new Date().toISOString();
  const diffHash = input.tool_output
    ? crypto.createHash("sha256").update(input.tool_output).digest("hex").slice(0, 16)
    : undefined;

  const entry: AuditEntry = {
    timestamp,
    callId: `${sessionId}:${timestamp}`,
    phase: "post",
    tool: input.tool_name,
    target,
    diffHash,
    exitStatus: input.exit_status ?? 0,
    actuallyExecuted: input.exit_status !== undefined && input.exit_status !== null,
    sessionId,
    ...(isTest ? { isTest: true } : {}),
  };

  await storage.append(entry);
}

function extractTarget(input: PostToolUseInput): string {
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
 * Extracts session_id from payload if present.
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
    // Don't block on parse failure
    return;
  }

  const input: PostToolUseInput = {
    tool_name: String(parsed.tool_name ?? ""),
    tool_input: (parsed.tool_input as Record<string, unknown>) ?? {},
    tool_output: parsed.tool_output as string | undefined,
    exit_status: parsed.exit_status as number | undefined,
  };

  // Extract session_id from the JSON payload if present
  const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : undefined;

  await handlePostToolUse(input, { sessionId });
}
