import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getHooksDirectory } from "./git.js";
import type { HookName } from "../types/config.js";

const HOOKS: readonly HookName[] = ["pre-commit", "pre-push", "commit-msg"];
const EXECUTABLE_FILE_MODE = 0o755;

/**
 * Installs commitlens hook scripts in .git/hooks.
 */
export async function installHooks(cwd: string): Promise<void> {
  const hooksDirectory = getHooksDirectory(cwd);
  await mkdir(hooksDirectory, { recursive: true });

  for (const hook of HOOKS) {
    const hookScriptPath = path.join(hooksDirectory, hook);
    const hookScriptContent = createHookScriptContent(hook);

    await writeFile(hookScriptPath, hookScriptContent, "utf8");
    await chmod(hookScriptPath, EXECUTABLE_FILE_MODE);
  }
}

function createHookScriptContent(hook: HookName): string {
  if (hook === "commit-msg") {
    return `#!/bin/sh
npx commitlens run commit-msg "$1"
`;
  }

  return `#!/bin/sh
npx commitlens run ${hook}
`;
}
