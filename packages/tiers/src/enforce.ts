import { Tier, TierConfig, TieredAction, TierDecision, NotificationHandler } from './types.js';

// MARMALADE: wire NotificationHandler to PagerDuty + email for Tier 3/4 escalations,
// add structured on-call routing based on agentName → team mapping

/**
 * Default notification handler — logs to stderr.
 */
export class ConsoleNotificationHandler implements NotificationHandler {
  async notify(decision: TierDecision, config: TierConfig): Promise<void> {
    process.stderr.write(
      `[${config.agentName}] Tier ${config.tier} notification: ${decision.outcome} — ${decision.action.summary}\n`
    );
  }
}

let _handler: NotificationHandler = new ConsoleNotificationHandler();

/**
 * Set the notification handler used by enforceTier.
 */
export function setNotificationHandler(handler: NotificationHandler): void {
  _handler = handler;
}

/**
 * Get the current notification handler.
 */
export function getNotificationHandler(): NotificationHandler {
  return _handler;
}

/**
 * Enforce tier policy on an action.
 */
export function enforceTier(config: TierConfig, action: TieredAction): TierDecision {
  const decision = buildDecision(config, action);

  // Log for all tiers
  logDecision(decision, config);

  // Notify for Tier 2-4 (fire-and-forget)
  if (config.tier >= Tier.Notify) {
    _handler.notify(decision, config).catch(() => {
      // fire-and-forget: notification failures don't block the action
    });
  }

  return decision;
}

function buildDecision(config: TierConfig, action: TieredAction): TierDecision {
  switch (config.tier) {
    case Tier.Silent:
      return { action, tier: config.tier, outcome: 'allowed' };

    case Tier.Notify:
      return { action, tier: config.tier, outcome: 'allowed' };

    case Tier.Approve:
      return {
        action,
        tier: config.tier,
        outcome: 'pending_approval',
        reason: 'Action requires human approval before execution',
        approvalCategory: config.approvalCategories?.[0],
      };

    case Tier.Assist:
      return {
        action,
        tier: config.tier,
        outcome: 'refused',
        reason: 'Agent cannot execute this action. A human must perform it manually.',
      };

    default:
      return { action, tier: config.tier, outcome: 'refused', reason: 'Unknown tier' };
  }
}

function logDecision(decision: TierDecision, config: TierConfig): void {
  const entry = {
    timestamp: new Date().toISOString(),
    agent: config.agentName,
    tier: decision.tier,
    outcome: decision.outcome,
    action: decision.action.type,
    target: decision.action.target,
    summary: decision.action.summary,
  };
  process.stderr.write(`[tier-enforce] ${JSON.stringify(entry)}\n`);
}
