# Marker Agent Framework

Shared agent infrastructure for the Marker family of sites: **Mountain Marker**, **Links Marker**, **Match Marker**, and eventually **Marmalade**.

## Dependency direction

```
framework  <--  agents  <--  sites
```

The framework knows nothing about specific agents or sites. Agents import from the framework. Sites import from agents and the framework. Never invert this flow.

## Packages

| Package | Purpose |
|---------|---------|
| `@marker/hooks` | Filesystem and Bash hooks — audit logging, policy enforcement |
| `@marker/kill-switch` | Emergency disable mechanism for all agents |
| `@marker/evals` | Promptfoo harness wrapper for agent evaluations |
| `@marker/tiers` | Action tier classification (read-only / reversible / irreversible) |
| `@marker/shadow-mode` | Output capture for human review before going live |

## Non-negotiable disciplines

Every Marker agent must satisfy all five before shipping:

1. **Evals** — every agent has a promptfoo eval suite that runs nightly.
2. **Tiers** — every action is classified by tier; irreversible actions require human approval.
3. **Shadow mode** — agents run in shadow mode first, logging what they *would* do for human review.
4. **Kill switch** — agents poll `isKilled()` before acting; `killAll()` halts everything immediately.
5. **Hooks** — filesystem and bash hooks are registered for audit trails and policy enforcement.

## Consuming from a Marker site

```bash
# In your site's package.json, add the framework packages you need:
pnpm add @marker/hooks @marker/kill-switch @marker/tiers @marker/shadow-mode
```

```typescript
import { isKilled } from "@marker/kill-switch";
import { classify, requiresApproval } from "@marker/tiers";
import { capture } from "@marker/shadow-mode";
import { registerHook } from "@marker/hooks";

// Check kill switch before any action
const status = isKilled();
if (status.killed) {
  console.log("Agents disabled:", status.reason);
  process.exit(1);
}

// Classify and gate actions
const tier = classify("publish-post");
if (requiresApproval(tier)) {
  // route to human approval queue
}
```

## Development

```bash
pnpm install
pnpm build
```

## Scripts

- `pnpm kill-all` — emergency disable all agents
- `pnpm drill-kill-switch` — weekly kill-switch drill
