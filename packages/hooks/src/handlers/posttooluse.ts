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
  options: { sessionId?: string; storage?: LocalFileStorage } = {},
): Promise<void> {
  const storage = options.storage ?? new LocalFileStorage();
  const sessionId = options.sessionId ?? process.env.MARKER_SESSION_ID ?? "unknown";

  const target = extractTarget(input);
  const diffHash = input.tool_output
    ? crypto.createHash("sha256").update(input.tool_output).digest("hex").slice(0, 16)
    : undefined;

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    tool: input.tool_name,
    target,
    diffHash,
    exitStatus: input.exit_status ?? 0,
    sessionId,
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
 */
export async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");

  let input: PostToolUseInput;
  try {
    input = JSON.parse(raw);
  } catch {
    // Don't block on parse failure
    return;
  }

  await handlePostToolUse(input);
}
