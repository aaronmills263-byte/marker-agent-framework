import { describe, it, expect, afterEach } from 'vitest';
import { manifest, run } from './index.js';
import { Tier, getRegisteredAgents } from '@marker/tiers';

describe('agent: weekly-bi', () => {
  afterEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
  });

  it('registers correctly with expected manifest', () => {
    expect(manifest.name).toBe('weekly-bi');
    expect(manifest.tier).toBe(Tier.Notify);
    expect(manifest.site).toBe('multi-site');
    expect(manifest.actionTypes).toContain('file_write');
  });

  it('appears in the global registry', () => {
    const agents = getRegisteredAgents();
    const found = agents.find((a) => a.name === 'weekly-bi');
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
