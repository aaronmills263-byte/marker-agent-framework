import { Tier, AgentManifest, registerAgent } from '@aaronmills263-byte/tiers';
import { isKilled } from '@aaronmills263-byte/kill-switch';
import { captureShadowOutput, ShadowModeConfig, LocalShadowStorage } from '@aaronmills263-byte/shadow-mode';

export const manifest: AgentManifest = {
  name: 'regulatory-monitor',
  tier: Tier.Approve,
  site: 'mountain-marker',
  marmaladeTransferTarget: 'ML-915',
  actionTypes: ['external_api', 'email_send'],
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
    input: { trigger: 'scheduled' },
    output: { changes: [], alerts: [] },
    wouldHaveActioned: true,
    actionDescription: 'Would have scanned regulatory sources and alerted on relevant changes',
  });

  process.stderr.write(`[${manifest.name}] Stub run complete (shadow mode)\n`);
}
