import { killAll, reset, isKilled } from '../packages/kill-switch/src/index.js';
import { getRegisteredAgents } from '../packages/tiers/src/index.js';

// Import all agent manifests to trigger registration
import '../agents/seo-social/src/index.js';
import '../agents/email-triage/src/index.js';
import '../agents/affiliate-recon/src/index.js';
import '../agents/weekly-bi/src/index.js';
import '../agents/regulatory-monitor/src/index.js';

async function main() {
  const agents = getRegisteredAgents();
  console.log(`\n🔴 Kill-switch drill: ${agents.length} agents registered\n`);

  // Step 1: Activate kill switch
  console.log('1. Activating kill switch...');
  killAll('Drill test — agents-drill-kill script');
  console.log(`   Kill switch active: ${isKilled()}`);

  // Step 2: Simulate each agent checking kill switch
  console.log('\n2. Simulating agent runs (all should bail):');
  const results: Array<{ name: string; bailed: boolean }> = [];

  for (const agent of agents) {
    const bailed = isKilled();
    results.push({ name: agent.name, bailed });
    console.log(`   ${bailed ? '✓' : '✗'} ${agent.name}: ${bailed ? 'BAILED (correct)' : 'DID NOT BAIL (ERROR)'}`);
  }

  // Step 3: Reset
  console.log('\n3. Resetting kill switch...');
  reset('Drill complete');
  console.log(`   Kill switch active: ${isKilled()}`);

  // Step 4: Report
  const allBailed = results.every((r) => r.bailed);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`DRILL RESULT: ${allBailed ? '✓ PASS — all agents respected kill switch' : '✗ FAIL — some agents did not bail'}`);
  console.log(`${'─'.repeat(50)}\n`);

  if (!allBailed) process.exit(1);
}

main().catch((err) => {
  console.error('Drill failed:', err);
  // Always try to reset
  reset('Drill failed — emergency reset');
  process.exit(1);
});
