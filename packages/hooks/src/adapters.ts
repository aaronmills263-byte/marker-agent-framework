import type { HookRules } from "./rules.js";

export interface ClaudeCodeHookCommand {
  type: string;
  command: string;
}

export interface ClaudeCodeSettings {
  hooks: {
    PreToolUse: ClaudeCodeHookCommand[];
    PostToolUse: ClaudeCodeHookCommand[];
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

/**
 * Convert hook rules to Claude Code settings.json format.
 * The settings reference shell scripts that invoke the TypeScript handlers.
 */
export function toClaudeCodeSettings(
  _rules: HookRules,
  markerDir: string = ".marker/hooks",
): ClaudeCodeSettings {
  return {
    hooks: {
      PreToolUse: [
        {
          type: "command",
          command: `${markerDir}/pretooluse.sh`,
        },
      ],
      PostToolUse: [
        {
          type: "command",
          command: `${markerDir}/posttooluse.sh`,
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
