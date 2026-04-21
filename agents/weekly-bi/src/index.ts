import { Tier, AgentManifest, registerAgent } from '@marker/tiers';
import { isKilled } from '@marker/kill-switch';
import { captureShadowOutput, ShadowModeConfig, LocalShadowStorage } from '@marker/shadow-mode';

export const manifest: AgentManifest = {
  name: 'weekly-bi',
  tier: Tier.Notify,
  site: 'multi-site',
  marmaladeTransferTarget: 'ML-917',
  actionTypes: ['file_write', 'external_api'],
  evalSuitePath: './src/eval.ts',
};

registerAgent(manifest);

const shadowConfig: ShadowModeConfig = {
  agentName: manifest.name,
  storage: new LocalShadowStorage(),
  graduationThreshold: 50,
};

export async function run(): Promise<void> {
  if (isKilled()) {
    process.stderr.write(`[${manifest.name}] Kill switch active — exiting\n`);
    return;
  }

  await captureShadowOutput(shadowConfig, {
    agentName: manifest.name,
    timestamp: new Date(),
    input: { trigger: 'weekly-cron' },
    output: { reports: [], metrics: {} },
    wouldHaveActioned: true,
    actionDescription: 'Would have generated weekly BI reports across all Marker sites',
  });

  process.stderr.write(`[${manifest.name}] Stub run complete (shadow mode)\n`);
}
