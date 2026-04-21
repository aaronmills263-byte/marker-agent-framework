import { describe, it, expect } from 'vitest';
import {
  runSuite,
  validateSuite,
  detectRegression,
  toPromptfooConfig,
  EvalSuite,
  EvalResult,
} from './index.js';

function makeScenario(id: string, input: unknown, expected: unknown) {
  return {
    id,
    description: `Scenario ${id}`,
    input,
    expected,
    assertions: ['exact_match' as const],
  };
}

function makeSuite(count: number, agentName = 'test-agent'): EvalSuite {
  return {
    agentName,
    scenarios: Array.from({ length: count }, (_, i) =>
      makeScenario(`s${i}`, { q: `input-${i}` }, { a: `output-${i}` })
    ),
    passingThreshold: 0.9,
  };
}

describe('runSuite', () => {
  it('executes all scenarios and returns correct pass/fail counts', async () => {
    const suite = makeSuite(5);
    // Executor that always returns the expected output
    const executor = async (input: unknown) => {
      const idx = (input as { q: string }).q.split('-')[1];
      return { a: `output-${idx}` };
    };

    const result = await runSuite(suite, executor);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(5);
    expect(result.passRate).toBe(1);
    expect(result.failures).toHaveLength(0);
  });

  it('reports failures correctly', async () => {
    const suite = makeSuite(3);
    const executor = async () => ({ a: 'wrong' });

    const result = await runSuite(suite, executor);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(3);
    expect(result.failures).toHaveLength(3);
  });

  it('handles executor errors gracefully', async () => {
    const suite = makeSuite(2);
    const executor = async () => {
      throw new Error('boom');
    };

    const result = await runSuite(suite, executor);
    expect(result.failed).toBe(2);
    expect(result.failures[0].reason).toContain('boom');
  });

  it('supports contains assertion', async () => {
    const suite: EvalSuite = {
      agentName: 'test',
      scenarios: [
        {
          id: 's1',
          description: 'contains test',
          input: 'hello',
          expected: 'world',
          assertions: ['contains'],
        },
      ],
      passingThreshold: 1,
    };
    const executor = async () => 'hello world';
    const result = await runSuite(suite, executor);
    expect(result.passed).toBe(1);
  });

  it('supports schema_match assertion', async () => {
    const suite: EvalSuite = {
      agentName: 'test',
      scenarios: [
        {
          id: 's1',
          description: 'schema test',
          input: {},
          expected: { name: '', age: 0 },
          assertions: ['schema_match'],
        },
      ],
      passingThreshold: 1,
    };
    const executor = async () => ({ name: 'Alice', age: 30, extra: true });
    const result = await runSuite(suite, executor);
    expect(result.passed).toBe(1);
  });
});

describe('validateSuite', () => {
  it('refuses suites with fewer than 20 scenarios', () => {
    const suite = makeSuite(19);
    const result = validateSuite(suite);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('19');
    expect(result.message).toContain('20');
  });

  it('accepts suites with 20+ scenarios', () => {
    const suite = makeSuite(20);
    const result = validateSuite(suite);
    expect(result.valid).toBe(true);
  });

  it('accepts suites with exactly 20 scenarios', () => {
    const suite = makeSuite(20);
    const result = validateSuite(suite);
    expect(result.valid).toBe(true);
  });
});

describe('detectRegression', () => {
  it('catches 5%+ pass-rate drops', () => {
    const baseline: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 18,
      failed: 2,
      total: 20,
      passRate: 0.9,
      failures: [],
    };
    const current: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 16,
      failed: 4,
      total: 20,
      passRate: 0.8,
      failures: [],
    };

    const report = detectRegression(current, baseline);
    expect(report.regressed).toBe(true);
    expect(report.delta).toBeCloseTo(-0.1);
    expect(report.message).toContain('Regression');
  });

  it('does not flag small drops (< 5%)', () => {
    const baseline: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 19,
      failed: 1,
      total: 20,
      passRate: 0.95,
      failures: [],
    };
    const current: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 18,
      failed: 2,
      total: 20,
      passRate: 0.9,
      failures: [],
    };

    const report = detectRegression(current, baseline);
    expect(report.regressed).toBe(false);
  });

  it('does not flag improvements', () => {
    const baseline: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 16,
      failed: 4,
      total: 20,
      passRate: 0.8,
      failures: [],
    };
    const current: EvalResult = {
      suite: 'test',
      timestamp: new Date(),
      passed: 19,
      failed: 1,
      total: 20,
      passRate: 0.95,
      failures: [],
    };

    const report = detectRegression(current, baseline);
    expect(report.regressed).toBe(false);
    expect(report.delta).toBeCloseTo(0.15);
  });
});

describe('toPromptfooConfig', () => {
  it('produces valid Promptfoo YAML structure', () => {
    const suite = makeSuite(20);
    const config = toPromptfooConfig(suite) as Record<string, unknown>;

    expect(config).toHaveProperty('description');
    expect(config).toHaveProperty('providers');
    expect(config).toHaveProperty('tests');
    expect(config).toHaveProperty('defaultTest');

    const providers = config.providers as Array<{ id: string }>;
    expect(providers[0].id).toBe('marker-agent:test-agent');

    const tests = config.tests as Array<{ description: string; vars: object; assert: object[] }>;
    expect(tests).toHaveLength(20);
    expect(tests[0]).toHaveProperty('description');
    expect(tests[0]).toHaveProperty('vars');
    expect(tests[0]).toHaveProperty('assert');
    expect(tests[0].assert[0]).toHaveProperty('type', 'equals');
  });

  it('maps assertion types correctly', () => {
    const suite: EvalSuite = {
      agentName: 'test',
      scenarios: [
        {
          id: 's1',
          description: 'test',
          input: 'x',
          expected: 'y',
          assertions: ['exact_match', 'contains', 'schema_match', 'llm_rubric'],
          rubric: 'Must be good',
        },
      ],
      passingThreshold: 0.9,
    };

    const config = toPromptfooConfig(suite) as { tests: Array<{ assert: Array<{ type: string; value: unknown }> }> };
    const asserts = config.tests[0].assert;
    expect(asserts[0].type).toBe('equals');
    expect(asserts[1].type).toBe('contains');
    expect(asserts[2].type).toBe('is-json');
    expect(asserts[3].type).toBe('llm-rubric');
    expect(asserts[3].value).toBe('Must be good');
  });
});
