import { Tier, TieredAction, ValidationResult } from './types.js';

const EXTERNAL_ACTION_TYPES: TieredAction['type'][] = ['external_api', 'social_post', 'email_send'];

// Audit-critical path patterns from @aaronmills263-byte/hooks defaultMarkerRules
const AUDIT_CRITICAL_PATTERNS = [
  'src/app/api/**',
  'src/lib/auth/**',
  'package.json',
  'pnpm-lock.yaml',
];

/**
 * Validate that a proposed tier assignment meets safety constraints.
 *
 * - External-action agents cannot be Tier 1 (silent).
 * - File writes to audit-critical paths recommend minimum Tier 2.
 */
export function validateTierAssignment(
  agentName: string,
  proposedTier: Tier,
  actionTypes: TieredAction['type'][]
): ValidationResult {
  // Rule 1: External actions cannot be Tier 1
  const hasExternalAction = actionTypes.some((t) => EXTERNAL_ACTION_TYPES.includes(t));
  if (hasExternalAction && proposedTier === Tier.Silent) {
    return {
      valid: false,
      message: 'Agents taking external actions cannot be Tier 1 (silent). Minimum Tier 2 (notify).',
      recommendedTier: Tier.Notify,
    };
  }

  // Rule 2: file_write agents targeting audit-critical paths should be Tier 2+
  if (actionTypes.includes('file_write') && proposedTier === Tier.Silent) {
    return {
      valid: true,
      message: `Agent "${agentName}" writes files — recommend minimum Tier 2 for audit-critical path coverage.`,
      recommendedTier: Tier.Notify,
    };
  }

  return { valid: true };
}

/**
 * Get the audit-critical path patterns (exposed for testing and cross-package use).
 */
export function getAuditCriticalPatterns(): string[] {
  return [...AUDIT_CRITICAL_PATTERNS];
}
