/** Hook that fires before a filesystem write. */
export interface BeforeWriteHook {
  path: string;
  content: string;
}

/** Hook that fires after a filesystem write. */
export interface AfterWriteHook {
  path: string;
  success: boolean;
}

/** Hook that fires before a bash command is executed. */
export interface BeforeBashHook {
  command: string;
  cwd: string;
}

/** Hook that fires after a bash command completes. */
export interface AfterBashHook {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type HookType = "before-write" | "after-write" | "before-bash" | "after-bash";

export interface HookHandler<T> {
  (event: T): Promise<void>;
}

/** Register a hook — stub implementation. */
export function registerHook<T>(_type: HookType, _handler: HookHandler<T>): void {
  // TODO: implement hook registration
}
