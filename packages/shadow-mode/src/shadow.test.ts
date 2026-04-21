import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  captureShadowOutput,
  canGraduate,
  LocalShadowStorage,
  ShadowModeConfig,
  ShadowOutput,
} from './index.js';

function makeShadowOutput(agentName: string, overrides?: Partial<ShadowOutput>): ShadowOutput {
  return {
    agentName,
    timestamp: new Date(),
    input: { query: 'test input' },
    output: { result: 'test output' },
    wouldHaveActioned: true,
    actionDescription: 'Would have posted to social media',
    ...overrides,
  };
}

describe('shadow-mode', () => {
  let tmpDir: string;
  let storage: LocalShadowStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marker-shadow-test-'));
    storage = new LocalShadowStorage(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('captureShadowOutput', () => {
    it('persists output to storage', async () => {
      const config: ShadowModeConfig = {
        agentName: 'test-agent',
        storage,
        graduationThreshold: 50,
      };
      const output = makeShadowOutput('test-agent');

      await captureShadowOutput(config, output);

      const results = await storage.query({ agentName: 'test-agent' });
      expect(results).toHaveLength(1);
      expect(results[0].agentName).toBe('test-agent');
      expect(results[0].wouldHaveActioned).toBe(true);
    });
  });

  describe('query', () => {
    it('returns filtered results by agentName', async () => {
      await storage.capture(makeShadowOutput('agent-a'));
      await storage.capture(makeShadowOutput('agent-b'));

      const results = await storage.query({ agentName: 'agent-a' });
      expect(results).toHaveLength(1);
      expect(results[0].agentName).toBe('agent-a');
    });

    it('filters by since/until date', async () => {
      const old = makeShadowOutput('agent-a', { timestamp: new Date('2024-01-01') });
      const recent = makeShadowOutput('agent-a', { timestamp: new Date('2025-06-01') });

      await storage.capture(old);
      await storage.capture(recent);

      const results = await storage.query({
        agentName: 'agent-a',
        since: new Date('2025-01-01'),
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('returns correct count for an agent', async () => {
      await storage.capture(makeShadowOutput('agent-a'));
      await storage.capture(makeShadowOutput('agent-a'));
      await storage.capture(makeShadowOutput('agent-b'));

      expect(await storage.count('agent-a')).toBe(2);
      expect(await storage.count('agent-b')).toBe(1);
      expect(await storage.count('agent-c')).toBe(0);
    });
  });

  describe('canGraduate', () => {
    it('returns false when under threshold', async () => {
      const config: ShadowModeConfig = {
        agentName: 'test-agent',
        storage,
        graduationThreshold: 50,
      };
      await storage.capture(makeShadowOutput('test-agent'));

      const result = await canGraduate(config);
      expect(result.canGraduate).toBe(false);
      expect(result.reviewed).toBe(1);
      expect(result.required).toBe(50);
    });

    it('returns true at threshold', async () => {
      const config: ShadowModeConfig = {
        agentName: 'test-agent',
        storage,
        graduationThreshold: 3,
      };
      await storage.capture(makeShadowOutput('test-agent'));
      await storage.capture(makeShadowOutput('test-agent'));
      await storage.capture(makeShadowOutput('test-agent'));

      const result = await canGraduate(config);
      expect(result.canGraduate).toBe(true);
      expect(result.reviewed).toBe(3);
    });

    it('returns true above threshold', async () => {
      const config: ShadowModeConfig = {
        agentName: 'test-agent',
        storage,
        graduationThreshold: 2,
      };
      await storage.capture(makeShadowOutput('test-agent'));
      await storage.capture(makeShadowOutput('test-agent'));
      await storage.capture(makeShadowOutput('test-agent'));

      const result = await canGraduate(config);
      expect(result.canGraduate).toBe(true);
    });
  });

  describe('LocalShadowStorage', () => {
    it('creates directory structure correctly', async () => {
      await storage.capture(makeShadowOutput('my-agent'));

      const agentDir = path.join(tmpDir, 'my-agent');
      expect(fs.existsSync(agentDir)).toBe(true);
      const files = fs.readdirSync(agentDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.json$/);
    });

    it('concurrent captures do not corrupt files', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        storage.capture(
          makeShadowOutput('concurrent-agent', {
            input: { index: i },
          })
        )
      );

      await Promise.all(promises);

      const count = await storage.count('concurrent-agent');
      expect(count).toBe(10);

      const results = await storage.query({ agentName: 'concurrent-agent' });
      expect(results).toHaveLength(10);
    });
  });
});
