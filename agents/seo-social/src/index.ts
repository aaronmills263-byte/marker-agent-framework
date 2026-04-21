import { Tier, AgentManifest, registerAgent } from '@marker/tiers';
import { isKilled } from '@marker/kill-switch';
import { captureShadowOutput, ShadowModeConfig, LocalShadowStorage } from '@marker/shadow-mode';

export const manifest: AgentManifest = {
  name: 'seo-social',
  tier: Tier.Approve,
  site: 'mountain-marker',
  marmaladeTransferTarget: 'ML-914',
  actionTypes: ['social_post', 'external_api'],
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

  // Shadow mode: capture what we would have done
  await captureShadowOutput(shadowConfig, {
    agentName: manifest.name,
    timestamp: new Date(),
    input: { trigger: 'scheduled' },
    output: { posts: [] },
    wouldHaveActioned: true,
    actionDescription: 'Would have generated and posted SEO-optimized social content',
  });

  process.stderr.write(`[${manifest.name}] Stub run complete (shadow mode)\n`);
}
