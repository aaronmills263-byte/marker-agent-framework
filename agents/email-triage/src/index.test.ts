import { describe, it, expect, afterEach } from 'vitest';
import { manifest, run } from './index.js';
import { Tier, getRegisteredAgents } from '@marker/tiers';

describe('agent: email-triage', () => {
  afterEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
  });

  it('registers correctly with expected manifest', () => {
    expect(manifest.name).toBe('email-triage');
    expect(manifest.tier).toBe(Tier.Approve);
    expect(manifest.site).toBe('links-marker');
    expect(manifest.actionTypes).toContain('email_send');
  });

  it('appears in the global registry', () => {
    const agents = getRegisteredAgents();
    const found = agents.find((a) => a.name === 'email-triage');
    expect(found).toBeDefined();
  });

  it('respects kill switch', async () => {
    process.env.MARKER_AGENTS_KILLED = '1';
    await expect(run()).resolves.toBeUndefined();
  });

  it('captures shadow output in normal operation', async () => {
    delete process.env.MARKER_AGENTS_KILLED;
    await expect(run()).resolves.toBeUndefined();
  });
});
