/**
 * Tier classification for agent actions.
 *
 * - read-only:   No side effects (e.g., fetching data, reading files)
 * - reversible:  Side effects that can be undone (e.g., draft creation, staging)
 * - irreversible: Side effects that cannot be undone (e.g., publishing, sending email)
 */
export type Tier = "read-only" | "reversible" | "irreversible";

export interface TieredAction {
  name: string;
  tier: Tier;
  description: string;
}

/** Classify an action's tier — stub implementation. */
export function classify(_action: string): Tier {
  // TODO: implement classification logic
  return "read-only";
}

/** Check whether the given tier requires human approval. */
export function requiresApproval(tier: Tier): boolean {
  return tier === "irreversible";
}
