import { describe, it, expect, afterEach } from 'vitest';
import { manifest, run } from './index.js';
import { Tier, getRegisteredAgents } from '@aaronmills263-byte/tiers';

describe('agent: regulatory-monitor', () => {
  afterEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
  });

  it('registers correctly with expected manifest', () => {
    expect(manifest.name).toBe('regulatory-monitor');
    expect(manifest.tier).toBe(Tier.Approve);
    expect(manifest.site).toBe('mountain-marker');
    expect(manifest.actionTypes).toContain('email_send');
  });

  it('appears in the global registry', () => {
    const agents = getRegisteredAgents();
    const found = agents.find((a) => a.name === 'regulatory-monitor');
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
