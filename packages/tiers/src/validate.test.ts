import { describe, it, expect } from 'vitest';
import { validateTierAssignment, Tier } from './index.js';

describe('validateTierAssignment', () => {
  it('refuses Tier 1 for agents with external_api actions', () => {
    const result = validateTierAssignment('social-bot', Tier.Silent, ['external_api']);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Tier 1');
    expect(result.message).toContain('Tier 2');
    expect(result.recommendedTier).toBe(Tier.Notify);
  });

  it('refuses Tier 1 for agents with social_post actions', () => {
    const result = validateTierAssignment('poster', Tier.Silent, ['social_post']);
    expect(result.valid).toBe(false);
    expect(result.recommendedTier).toBe(Tier.Notify);
  });

  it('refuses Tier 1 for agents with email_send actions', () => {
    const result = validateTierAssignment('mailer', Tier.Silent, ['email_send']);
    expect(result.valid).toBe(false);
    expect(result.recommendedTier).toBe(Tier.Notify);
  });

  it('allows Tier 2+ for external-action agents', () => {
    const result = validateTierAssignment('poster', Tier.Notify, ['social_post']);
    expect(result.valid).toBe(true);
  });

  it('recommends Tier 2+ for file_write agents at Tier 1', () => {
    const result = validateTierAssignment('writer', Tier.Silent, ['file_write']);
    expect(result.valid).toBe(true);
    expect(result.recommendedTier).toBe(Tier.Notify);
    expect(result.message).toContain('audit-critical');
  });

  it('allows any tier for bash-only agents at Tier 1', () => {
    const result = validateTierAssignment('runner', Tier.Silent, ['bash']);
    expect(result.valid).toBe(true);
    expect(result.recommendedTier).toBeUndefined();
  });

  it('allows Tier 3 for any action types', () => {
    const result = validateTierAssignment('safe-agent', Tier.Approve, [
      'external_api',
      'social_post',
      'email_send',
      'file_write',
    ]);
    expect(result.valid).toBe(true);
  });
});
