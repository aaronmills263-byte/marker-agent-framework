export interface HookRules {
  protectedPaths: string[];       // glob patterns, writes require approval
  auditCriticalPaths: string[];   // writes always logged, don't block
  bashDenyPatterns: RegExp[];     // command patterns that block
  bashWarnPatterns: RegExp[];     // command patterns that log warning
}

// MARMALADE: tighten rules — add FCRA-sensitive paths, stricter Bash deny list,
// block all npm install of unvetted packages
export const defaultMarkerRules: HookRules = {
  protectedPaths: [
    ".env*",
    "src/middleware.ts",
    "src/lib/supabase-admin.ts",
    "src/lib/stripe.ts",
    "src/app/api/**/webhook/**",
  ],

  auditCriticalPaths: [
    "src/app/api/**",
    "src/lib/auth/**",
    "package.json",
    "pnpm-lock.yaml",
  ],

  bashDenyPatterns: [
    /rm\s+-rf\s+\//,              // rm -rf with absolute root path
    /curl.*\|\s*(ba)?sh/,         // pipe curl to shell
    /chmod\s+777/,                // world-writable permissions
    /:\(\)\{\s*:\|\s*:&\s*\}\s*;:/, // fork bomb
  ],

  bashWarnPatterns: [
    /git\s+push\s+--force/,
    /pnpm\s+publish/,
    /vercel\s+(--prod|deploy)/,
  ],
};
