import { getRegisteredAgents, Tier } from '../packages/tiers/src/index.js';

// Import all agent manifests to trigger registration
import '../agents/seo-social/src/index.js';
import '../agents/email-triage/src/index.js';
import '../agents/affiliate-recon/src/index.js';
import '../agents/weekly-bi/src/index.js';
import '../agents/regulatory-monitor/src/index.js';

const tierNames: Record<number, string> = {
  [Tier.Silent]: 'Silent (1)',
  [Tier.Notify]: 'Notify (2)',
  [Tier.Approve]: 'Approve (3)',
  [Tier.Assist]: 'Assist (4)',
};

const agents = getRegisteredAgents();

console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ Marker Agent Registry                                                       │');
console.log('├──────────────────────┬────────────┬──────────────────┬────────────┬─────────┤');
console.log('│ Agent                │ Tier       │ Site             │ Transfer   │ Actions │');
console.log('├──────────────────────┼────────────┼──────────────────┼────────────┼─────────┤');

for (const agent of agents) {
  const name = agent.name.padEnd(20);
  const tier = tierNames[agent.tier].padEnd(10);
  const site = agent.site.padEnd(16);
  const transfer = agent.marmaladeTransferTarget.padEnd(10);
  const actions = agent.actionTypes.length.toString();
  console.log(`│ ${name} │ ${tier} │ ${site} │ ${transfer} │ ${actions.padEnd(7)} │`);
}

console.log('└──────────────────────┴────────────┴──────────────────┴────────────┴─────────┘');
console.log(`\nTotal: ${agents.length} agents registered\n`);
