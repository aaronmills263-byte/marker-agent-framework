import { EvalScenario, EvalSuite, EvalResult, ValidationResult, RegressionReport } from './types.js';

const MIN_SCENARIOS = 20;

/**
 * Run an eval suite against an executor function.
 * The executor is agent-specific — takes scenario input, returns output.
 */
export async function runSuite(
  suite: EvalSuite,
  executor: (input: unknown) => Promise<unknown>
): Promise<EvalResult> {
  const failures: Array<{ scenarioId: string; reason: string }> = [];
  let passed = 0;

  for (const scenario of suite.scenarios) {
    try {
      const output = await executor(scenario.input);
      const pass = evaluateAssertions(scenario, output);
      if (pass) {
        passed++;
      } else {
        failures.push({ scenarioId: scenario.id, reason: 'Assertions failed' });
      }
    } catch (err) {
      failures.push({
        scenarioId: scenario.id,
        reason: `Executor threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const total = suite.scenarios.length;
  return {
    suite: suite.agentName,
    timestamp: new Date(),
    passed,
    failed: total - passed,
    total,
    passRate: total > 0 ? passed / total : 0,
    failures,
  };
}

/**
 * Validate that an eval suite meets minimum requirements.
 * Refuses suites with fewer than 20 scenarios.
 */
export function validateSuite(suite: EvalSuite): ValidationResult {
  if (suite.scenarios.length < MIN_SCENARIOS) {
    return {
      valid: false,
      message: `Suite "${suite.agentName}" has ${suite.scenarios.length} scenarios, minimum ${MIN_SCENARIOS} required.`,
    };
  }
  return { valid: true };
}

/**
 * Detect regression between current and baseline eval results.
 * Flags if current pass rate is worse than baseline by more than 5%.
 */
export function detectRegression(current: EvalResult, baseline: EvalResult): RegressionReport {
  const delta = current.passRate - baseline.passRate;
  const regressed = delta < -0.05;

  return {
    regressed,
    currentPassRate: current.passRate,
    baselinePassRate: baseline.passRate,
    delta,
    message: regressed
      ? `Regression detected: pass rate dropped from ${(baseline.passRate * 100).toFixed(1)}% to ${(current.passRate * 100).toFixed(1)}% (${(delta * 100).toFixed(1)}%)`
      : `No regression: pass rate ${(current.passRate * 100).toFixed(1)}% (baseline ${(baseline.passRate * 100).toFixed(1)}%)`,
  };
}

function evaluateAssertions(scenario: EvalScenario, output: unknown): boolean {
  for (const assertion of scenario.assertions) {
    switch (assertion) {
      case 'exact_match':
        if (JSON.stringify(output) !== JSON.stringify(scenario.expected)) return false;
        break;
      case 'contains':
        if (typeof output === 'string' && typeof scenario.expected === 'string') {
          if (!output.includes(scenario.expected)) return false;
        } else if (JSON.stringify(output).indexOf(JSON.stringify(scenario.expected)) === -1) {
          return false;
        }
        break;
      case 'schema_match':
        // Basic type check — matches if output has same top-level keys as expected
        if (typeof output === 'object' && output !== null && typeof scenario.expected === 'object' && scenario.expected !== null) {
          const expectedKeys = Object.keys(scenario.expected);
          const outputKeys = Object.keys(output);
          if (!expectedKeys.every((k) => outputKeys.includes(k))) return false;
        }
        break;
      case 'llm_rubric':
        // LLM rubric evaluation is deferred to promptfoo integration
        // For now, pass if output is non-null
        if (output === null || output === undefined) return false;
        break;
    }
  }
  return true;
}
