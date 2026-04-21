import { ShadowModeConfig, ShadowOutput } from './types.js';

/**
 * Capture shadow output — agents call this instead of executing their action when in shadow mode.
 */
export async function captureShadowOutput(
  config: ShadowModeConfig,
  output: ShadowOutput
): Promise<void> {
  await config.storage.capture(output);
}

/**
 * Check if the agent has enough reviewed outputs to exit shadow mode.
 */
export async function canGraduate(
  config: ShadowModeConfig
): Promise<{ canGraduate: boolean; reviewed: number; required: number }> {
  const reviewed = await config.storage.count(config.agentName);
  return {
    canGraduate: reviewed >= config.graduationThreshold,
    reviewed,
    required: config.graduationThreshold,
  };
}
