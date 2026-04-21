import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { install } from "./generate.js";

describe("hooks install integration", () => {
  let tmpDir: string;
  let hooksPackageRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marker-hooks-test-"));
    // Create a minimal package.json so findRepoRoot works
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "test-consumer" }),
    );

    // Determine the hooks package root (this repo's packages/hooks)
    hooksPackageRoot = path.resolve(__dirname, "..");

    // Simulate an installed @marker/hooks in node_modules
    const markerHooksTarget = path.join(tmpDir, "node_modules", "@marker", "hooks");
    fs.mkdirSync(markerHooksTarget, { recursive: true });
    // Symlink so the dist directory is accessible
    fs.symlinkSync(
      path.join(hooksPackageRoot, "dist"),
      path.join(markerHooksTarget, "dist"),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("installs shell scripts that invoke the CLI handlers", () => {
    install(tmpDir);

    const preScript = path.join(tmpDir, ".marker", "hooks", "pretooluse.sh");
    const postScript = path.join(tmpDir, ".marker", "hooks", "posttooluse.sh");

    expect(fs.existsSync(preScript)).toBe(true);
    expect(fs.existsSync(postScript)).toBe(true);

    // Verify scripts reference the correct handler paths
    const preContent = fs.readFileSync(preScript, "utf-8");
    expect(preContent).toContain("pretooluse-cli.js");
    expect(preContent).toContain("node ");
    expect(preContent).not.toContain("npx tsx");
  });

  it("pretooluse.sh blocks a denied bash command (exit 2)", () => {
    install(tmpDir);

    const preScript = path.join(tmpDir, ".marker", "hooks", "pretooluse.sh");
    const payload = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf /" },
    });

    try {
      execSync(`echo '${payload}' | bash "${preScript}"`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      // Should not reach here
      expect.fail("Expected script to exit with code 2");
    } catch (err: any) {
      expect(err.status).toBe(2);
      expect(err.stdout || err.stderr).toContain("Blocked");
    }
  });

  it("pretooluse.sh allows a safe command (exit 0)", () => {
    install(tmpDir);

    const preScript = path.join(tmpDir, ".marker", "hooks", "pretooluse.sh");
    const payload = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "echo hello" },
    });

    const result = execSync(`echo '${payload}' | bash "${preScript}"`, {
      cwd: tmpDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // If we get here without throwing, exit code was 0
    expect(true).toBe(true);
  });

  it("posttooluse.sh always exits 0 (audit only)", () => {
    install(tmpDir);

    const postScript = path.join(tmpDir, ".marker", "hooks", "posttooluse.sh");
    const payload = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf /" },
      tool_output: "done",
      exit_status: 0,
    });

    // Should not throw — posttooluse never blocks
    const result = execSync(`echo '${payload}' | bash "${postScript}"`, {
      cwd: tmpDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(true).toBe(true);
  });

  it("pretooluse.sh blocks writes to protected paths (exit 2)", () => {
    install(tmpDir);

    const preScript = path.join(tmpDir, ".marker", "hooks", "pretooluse.sh");
    const payload = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: ".env.local" },
    });

    try {
      execSync(`echo '${payload}' | bash "${preScript}"`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect.fail("Expected script to exit with code 2");
    } catch (err: any) {
      expect(err.status).toBe(2);
      expect(err.stdout || err.stderr).toContain("Blocked");
    }
  });
});
