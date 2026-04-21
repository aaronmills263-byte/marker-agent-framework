import { describe, it, expect, beforeEach } from 'vitest';
import {
  enforceTier,
  setNotificationHandler,
  ConsoleNotificationHandler,
  Tier,
  TierConfig,
  TieredAction,
  TierDecision,
  NotificationHandler,
} from './index.js';

function makeAction(type: TieredAction['type'] = 'file_write'): TieredAction {
  return { type, target: '/tmp/test', summary: 'test action' };
}

function makeConfig(tier: Tier): TierConfig {
  return { tier, agentName: 'test-agent', notificationChannels: ['log'] };
}

describe('enforceTier', () => {
  let notifications: TierDecision[];
  let mockHandler: NotificationHandler;

  beforeEach(() => {
    notifications = [];
    mockHandler = {
      async notify(decision: TierDecision) {
        notifications.push(decision);
      },
    };
    setNotificationHandler(mockHandler);
  });

  it('Tier 1 (Silent): returns allowed, no notification', () => {
    const decision = enforceTier(makeConfig(Tier.Silent), makeAction());
    expect(decision.outcome).toBe('allowed');
    expect(decision.tier).toBe(Tier.Silent);
    // Notification handler should NOT be invoked for Tier 1
    expect(notifications).toHaveLength(0);
  });

  it('Tier 2 (Notify): returns allowed, invokes notification', async () => {
    const decision = enforceTier(makeConfig(Tier.Notify), makeAction());
    expect(decision.outcome).toBe('allowed');
    expect(decision.tier).toBe(Tier.Notify);
    // Allow microtask to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(notifications).toHaveLength(1);
    expect(notifications[0].outcome).toBe('allowed');
  });

  it('Tier 3 (Approve): returns pending_approval, invokes notification', async () => {
    const config = makeConfig(Tier.Approve);
    config.approvalCategories = ['deploy'];
    const decision = enforceTier(config, makeAction());
    expect(decision.outcome).toBe('pending_approval');
    expect(decision.tier).toBe(Tier.Approve);
    expect(decision.reason).toContain('approval');
    await new Promise((r) => setTimeout(r, 10));
    expect(notifications).toHaveLength(1);
  });

  it('Tier 4 (Assist): returns refused, invokes notification', async () => {
    const decision = enforceTier(makeConfig(Tier.Assist), makeAction());
    expect(decision.outcome).toBe('refused');
    expect(decision.tier).toBe(Tier.Assist);
    expect(decision.reason).toContain('human');
    await new Promise((r) => setTimeout(r, 10));
    expect(notifications).toHaveLength(1);
  });

  it('notification handler receives correct config and decision', async () => {
    const config = makeConfig(Tier.Notify);
    const action = makeAction('external_api');
    enforceTier(config, action);
    await new Promise((r) => setTimeout(r, 10));
    expect(notifications[0].action.type).toBe('external_api');
  });
});

describe('ConsoleNotificationHandler', () => {
  it('writes to stderr without throwing', async () => {
    const handler = new ConsoleNotificationHandler();
    const decision: TierDecision = {
      action: makeAction(),
      tier: Tier.Notify,
      outcome: 'allowed',
    };
    await expect(
      handler.notify(decision, makeConfig(Tier.Notify))
    ).resolves.toBeUndefined();
  });
});
