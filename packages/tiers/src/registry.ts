import { Tier, TieredAction, ValidationResult } from './types.js';
import { validateTierAssignment } from './validate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AgentManifest {
  name: string;
  tier: Tier;
  site: 'mountain-marker' | 'links-marker' | 'match-marker' | 'marmalade' | 'multi-site';
  marmaladeTransferTarget: string;   // e.g. 'ML-914'
  actionTypes: TieredAction['type'][];
  evalSuitePath: string;
}

// Use globalThis to ensure singleton across module instances (workspace packages
// may resolve to different copies of this module)
const REGISTRY_KEY = Symbol.for('marker.agent.registry');
const _global = globalThis as unknown as { [key: symbol]: Map<string, AgentManifest> };
if (!_global[REGISTRY_KEY]) {
  _global[REGISTRY_KEY] = new Map();
}
const _agents: Map<string, AgentManifest> = _global[REGISTRY_KEY];

/**
 * Register an agent manifest in the global registry.
 */
export function registerAgent(manifest: AgentManifest): void {
  _agents.set(manifest.name, manifest);
}

/**
 * Get all registered agent manifests.
 */
export function getRegisteredAgents(): AgentManifest[] {
  return Array.from(_agents.values());
}

/**
 * Validate an agent registration:
 * - Tier assignment must pass validateTierAssignment
 * - Eval suite path must exist (if running in a context where fs is available)
 */
export function validateRegistration(manifest: AgentManifest): ValidationResult {
  const tierResult = validateTierAssignment(manifest.name, manifest.tier, manifest.actionTypes);
  if (!tierResult.valid) {
    return tierResult;
  }

  // Check eval suite exists (best-effort, won't fail in test envs without files)
  try {
    const resolved = path.resolve(manifest.evalSuitePath);
    if (!fs.existsSync(resolved)) {
      return {
        valid: false,
        message: `Eval suite not found at ${manifest.evalSuitePath}`,
      };
    }
  } catch {
    // If we can't check the filesystem, skip this validation
  }

  return { valid: true };
}

/**
 * Clear the registry (for testing).
 */
export function clearRegistry(): void {
  _global[REGISTRY_KEY].clear();
}
