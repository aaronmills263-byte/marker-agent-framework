import * as fs from 'node:fs';
import * as path from 'node:path';
import { ShadowOutput, ShadowStorage } from '../types.js';

// MARMALADE: swap for SupabaseShadowStorage with per-tenant isolation —
// Marmalade shadow outputs must be tenant-scoped for compliance

const DEFAULT_BASE_DIR = path.join(process.env.HOME ?? '/tmp', '.marker', 'shadow');

/**
 * Local filesystem implementation of ShadowStorage.
 * Writes to ~/.marker/shadow/<agentName>/<timestamp>.json
 */
export class LocalShadowStorage implements ShadowStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? DEFAULT_BASE_DIR;
  }

  async capture(output: ShadowOutput): Promise<void> {
    const agentDir = path.join(this.baseDir, output.agentName);
    fs.mkdirSync(agentDir, { recursive: true });

    const timestamp = output.timestamp.toISOString().replace(/[:.]/g, '-');
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}_${uniqueSuffix}.json`;
    const filePath = path.join(agentDir, filename);

    const serializable = {
      ...output,
      timestamp: output.timestamp.toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
  }

  async query(filter: {
    agentName?: string;
    since?: Date;
    until?: Date;
  }): Promise<ShadowOutput[]> {
    const results: ShadowOutput[] = [];

    const agentDirs = filter.agentName
      ? [path.join(this.baseDir, filter.agentName)]
      : this.listAgentDirs();

    for (const dir of agentDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
          const data = JSON.parse(raw);
          const output: ShadowOutput = {
            ...data,
            timestamp: new Date(data.timestamp),
          };

          if (filter.since && output.timestamp < filter.since) continue;
          if (filter.until && output.timestamp > filter.until) continue;

          results.push(output);
        } catch {
          // Skip corrupted files
        }
      }
    }

    return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async count(agentName: string): Promise<number> {
    const dir = path.join(this.baseDir, agentName);
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length;
  }

  private listAgentDirs(): string[] {
    if (!fs.existsSync(this.baseDir)) return [];
    return fs
      .readdirSync(this.baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(this.baseDir, d.name));
  }
}
