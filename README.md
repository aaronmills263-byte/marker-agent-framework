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
| `@aaronmills263-byte/hooks` | Filesystem and Bash hooks — audit logging, policy enforcement |
| `@aaronmills263-byte/kill-switch` | Emergency disable mechanism for all agents |
| `@aaronmills263-byte/evals` | Promptfoo harness wrapper for agent evaluations |
| `@aaronmills263-byte/tiers` | Action tier classification (read-only / reversible / irreversible) |
| `@aaronmills263-byte/shadow-mode` | Output capture for human review before going live |

## Non-negotiable disciplines

Every Marker agent must satisfy all five before shipping:

1. **Evals** — every agent has a promptfoo eval suite that runs nightly.
2. **Tiers** — every action is classified by tier; irreversible actions require human approval.
3. **Shadow mode** — agents run in shadow mode first, logging what they *would* do for human review.
4. **Kill switch** — agents poll `isKilled()` before acting; `killAll()` halts everything immediately.
5. **Hooks** — filesystem and bash hooks are registered for audit trails and policy enforcement.

## Consuming from a Marker site

Each `@aaronmills263-byte/*` package declares its cross-package dependencies as **peer dependencies**. When you install a package, you must also install its peers. In practice, install all five together:

```bash
# Mountain Marker / Marmalade / any consuming project:
pnpm add \
  @aaronmills263-byte/hooks \
  @aaronmills263-byte/kill-switch \
  @aaronmills263-byte/tiers \
  @aaronmills263-byte/shadow-mode \
  @aaronmills263-byte/evals
```

> **Why?** The framework uses `peerDependencies` so that `workspace:*` protocols (used internally for monorepo dev) never leak into your lockfile. You control which versions you pin.

If you only need a subset, check each package's `peerDependencies` field. Currently:
- `@aaronmills263-byte/hooks` requires `@aaronmills263-byte/kill-switch` as a peer.

```typescript
import { isKilled } from "@aaronmills263-byte/kill-switch";
import { classify, requiresApproval } from "@aaronmills263-byte/tiers";
import { capture } from "@aaronmills263-byte/shadow-mode";
import { registerHook } from "@aaronmills263-byte/hooks";

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
