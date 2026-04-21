import { EvalSuite } from './types.js';

// MARMALADE: add FCRA-specific eval scenarios — tenant screening accuracy,
// adverse action letter completeness, regulatory language compliance

/**
 * Convert a Marker EvalSuite to a Promptfoo YAML-compatible config object.
 * Consumers can serialize this to YAML and run `promptfoo eval` against it.
 */
export function toPromptfooConfig(suite: EvalSuite): object {
  return {
    description: `Eval suite for ${suite.agentName}`,
    providers: [
      {
        id: `marker-agent:${suite.agentName}`,
        config: {
          agentName: suite.agentName,
        },
      },
    ],
    tests: suite.scenarios.map((scenario) => ({
      description: scenario.description,
      vars: {
        input: scenario.input,
      },
      assert: scenario.assertions.map((assertion) => {
        switch (assertion) {
          case 'exact_match':
            return { type: 'equals', value: scenario.expected };
          case 'contains':
            return { type: 'contains', value: scenario.expected };
          case 'schema_match':
            return { type: 'is-json', value: JSON.stringify(scenario.expected) };
          case 'llm_rubric':
            return { type: 'llm-rubric', value: scenario.rubric ?? 'Output meets requirements' };
        }
      }),
    })),
    defaultTest: {
      options: {
        threshold: suite.passingThreshold,
      },
    },
  };
}
