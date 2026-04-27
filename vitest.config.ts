import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/src/**/*.test.ts", "agents/*/src/**/*.test.ts"],
    // Kill-switch state file at ~/.marker/kill-switch.state is shared mutable state;
    // parallel test files race on it. Sequential execution avoids the flake.
    fileParallelism: false,
  },
});
