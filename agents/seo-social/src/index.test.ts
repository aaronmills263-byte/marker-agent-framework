import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { manifest, run } from './index.js';
import { isKilled, killAll, reset } from '@aaronmills263-byte/kill-switch';
import { Tier, getRegisteredAgents } from '@aaronmills263-byte/tiers';

describe('agent: seo-social', () => {
  afterEach(() => {
    delete process.env.MARKER_AGENTS_KILLED;
  });

  it('registers correctly with expected manifest', () => {
    expect(manifest.name).toBe('seo-social');
    expect(manifest.tier).toBe(Tier.Approve);
    expect(manifest.site).toBe('mountain-marker');
    expect(manifest.actionTypes).toContain('social_post');
  });

  it('appears in the global registry', () => {
    const agents = getRegisteredAgents();
    const found = agents.find((a) => a.name === 'seo-social');
    expect(found).toBeDefined();
  });

  it('respects kill switch', async () => {
    process.env.MARKER_AGENTS_KILLED = '1';
    // Should exit without error
    await expect(run()).resolves.toBeUndefined();
  });

  it('captures shadow output in normal operation', async () => {
    delete process.env.MARKER_AGENTS_KILLED;
    // Should complete without error (shadow capture)
    await expect(run()).resolves.toBeUndefined();
  });
});
