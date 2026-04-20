export interface EvalCase {
  id: string;
  prompt: string;
  expectedOutput?: string;
  tags?: string[];
}

export interface EvalResult {
  caseId: string;
  passed: boolean;
  score: number;
  output: string;
}

export interface EvalSuite {
  name: string;
  cases: EvalCase[];
}

/** Run an eval suite — stub implementation. */
export async function runSuite(_suite: EvalSuite): Promise<EvalResult[]> {
  // TODO: integrate with promptfoo
  return [];
}
