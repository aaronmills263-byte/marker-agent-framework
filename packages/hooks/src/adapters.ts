import type { HookRules } from "./rules.js";

export interface ClaudeCodeHookCommand {
  type: string;
  command: string;
}

export interface ClaudeCodeHookEntry {
  matcher: { tools: string[] };
  hooks: ClaudeCodeHookCommand[];
}

export interface ClaudeCodeSettings {
  hooks: {
    PreToolUse: ClaudeCodeHookEntry[];
    PostToolUse: ClaudeCodeHookEntry[];
  };
}

export interface AgentSdkPermission {
  tool: string;
  allowed: boolean;
  condition?: string;
}

export interface AgentSdkConfig {
  permissions: AgentSdkPermission[];
  denyPatterns: string[];
  protectedPaths: string[];
}

/** Tools that our hooks need to inspect — Write/Edit for path guards, Bash for deny patterns. */
const HOOKED_TOOLS = ["Write", "Edit", "Bash"];

/**
 * Convert hook rules to Claude Code settings.json format.
 * Uses the current matcher-based schema that Claude Code requires.
 *
 * @param hooksDir Absolute path to the directory containing pretooluse.sh / posttooluse.sh.
 *                 Must be absolute so hooks work regardless of Claude Code's cwd.
 */
export function toClaudeCodeSettings(
  _rules: HookRules,
  hooksDir: string,
): ClaudeCodeSettings {
  if (!hooksDir.startsWith("/")) {
    throw new Error(
      `toClaudeCodeSettings requires an absolute hooksDir path, got: ${hooksDir}`,
    );
  }

  return {
    hooks: {
      PreToolUse: [
        {
          matcher: { tools: HOOKED_TOOLS },
          hooks: [
            {
              type: "command",
              command: `${hooksDir}/pretooluse.sh`,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: { tools: HOOKED_TOOLS },
          hooks: [
            {
              type: "command",
              command: `${hooksDir}/posttooluse.sh`,
            },
          ],
        },
      ],
    },
  };
}

/**
 * Convert hook rules to Agent SDK config format.
 * Maps our deny/warn patterns and protected paths into SDK permissions.
 */
export function toAgentSdkConfig(
  rules: HookRules,
  _tier: "read-only" | "reversible" | "irreversible" = "read-only",
): AgentSdkConfig {
  return {
    permissions: [
      { tool: "Bash", allowed: true, condition: "checked against deny patterns" },
      { tool: "Write", allowed: true, condition: "checked against protected paths" },
      { tool: "Edit", allowed: true, condition: "checked against protected paths" },
    ],
    denyPatterns: rules.bashDenyPatterns.map((p) => p.source),
    protectedPaths: rules.protectedPaths,
  };
}
