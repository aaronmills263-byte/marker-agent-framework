export interface EvalScenario {
  id: string;
  description: string;
  input: unknown;
  expected: unknown;
  assertions: Array<'exact_match' | 'contains' | 'schema_match' | 'llm_rubric'>;
  rubric?: string;               // for llm_rubric assertions
}

export interface EvalSuite {
  agentName: string;
  scenarios: EvalScenario[];     // minimum 20 per brief discipline
  passingThreshold: number;      // e.g. 0.9 = 90% must pass
}

export interface EvalResult {
  suite: string;
  timestamp: Date;
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  failures: Array<{ scenarioId: string; reason: string }>;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface RegressionReport {
  regressed: boolean;
  currentPassRate: number;
  baselinePassRate: number;
  delta: number;
  message: string;
}
