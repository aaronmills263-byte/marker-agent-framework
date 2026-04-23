import * as fs from "node:fs";
import * as path from "node:path";
import { defaultMarkerRules, type HookRules } from "./rules.js";

/**
 * Find the consuming repo root by walking up from startDir looking for
 * a directory that has both package.json and a .marker directory.
 * Falls back to the first package.json if no .marker directory is found.
 */
export function findConsumerRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  let firstPkgJson: string | undefined;

  while (dir !== path.dirname(dir)) {
    const hasPkg = fs.existsSync(path.join(dir, "package.json"));
    const hasMarker = fs.existsSync(path.join(dir, ".marker"));

    if (hasPkg && hasMarker) {
      return dir;
    }
    if (hasPkg && !firstPkgJson) {
      firstPkgJson = dir;
    }
    dir = path.dirname(dir);
  }

  return firstPkgJson;
}

/**
 * Load consumer's .marker/config.ts rules, merging with defaults.
 * Consumer rules win on conflicts (they spread last).
 *
 * Returns defaultMarkerRules if no consumer config is found.
 */
export async function loadConsumerRules(startDir: string): Promise<HookRules> {
  const root = findConsumerRoot(startDir);
  if (!root) {
    return defaultMarkerRules;
  }

  // Try .js first (runtime), then .ts (dev with tsx)
  const jsPath = path.join(root, ".marker", "config.js");
  const tsPath = path.join(root, ".marker", "config.ts");
  const configPath = fs.existsSync(jsPath) ? jsPath : fs.existsSync(tsPath) ? tsPath : undefined;

  if (!configPath) {
    return defaultMarkerRules;
  }

  try {
    // Dynamic import — .js works with node, .ts works with tsx at dev time.
    // The config file exports { rules: HookRules }.
    const mod = await import(configPath);
    const consumerRules: Partial<HookRules> = mod.rules ?? mod.default?.rules;

    if (!consumerRules) {
      return defaultMarkerRules;
    }

    return {
      protectedPaths: consumerRules.protectedPaths ?? defaultMarkerRules.protectedPaths,
      auditCriticalPaths: consumerRules.auditCriticalPaths ?? defaultMarkerRules.auditCriticalPaths,
      bashDenyPatterns: consumerRules.bashDenyPatterns ?? defaultMarkerRules.bashDenyPatterns,
      bashWarnPatterns: consumerRules.bashWarnPatterns ?? defaultMarkerRules.bashWarnPatterns,
    };
  } catch {
    // If config loading fails, fall back to defaults rather than crashing the hook
    return defaultMarkerRules;
  }
}
