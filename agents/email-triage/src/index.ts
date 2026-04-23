import { Tier, AgentManifest, registerAgent } from '@aaronmills263-byte/tiers';
import { isKilled } from '@aaronmills263-byte/kill-switch';
import { captureShadowOutput, ShadowModeConfig, LocalShadowStorage } from '@aaronmills263-byte/shadow-mode';

export const manifest: AgentManifest = {
  name: 'email-triage',
  tier: Tier.Approve,
  site: 'links-marker',
  marmaladeTransferTarget: 'ML-914',
  actionTypes: ['email_send', 'external_api'],
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
    output: { triaged: 0, routed: 0 },
    wouldHaveActioned: true,
    actionDescription: 'Would have triaged incoming emails and routed to appropriate queues',
  });

  process.stderr.write(`[${manifest.name}] Stub run complete (shadow mode)\n`);
}
