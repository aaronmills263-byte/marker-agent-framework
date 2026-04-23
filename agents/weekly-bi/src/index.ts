import { Tier, AgentManifest, registerAgent } from '@aaronmills263-byte/tiers';
import { isKilled } from '@aaronmills263-byte/kill-switch';
import { captureShadowOutput, ShadowModeConfig, LocalShadowStorage } from '@aaronmills263-byte/shadow-mode';

export const manifest: AgentManifest = {
  name: 'weekly-bi',
  tier: Tier.Notify,
  site: 'multi-site',
  marmaladeTransferTarget: 'Marmalade Weekly BI Agent (ID TBD)',
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
