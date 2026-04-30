import process from "node:process";

import { runPipeline } from "../../core/pipeline-runner.js";
import { CommitlensError } from "../../errors/commitlens-error.js";
import type { HookName } from "../../types/config.js";

const SUPPORTED_HOOKS: readonly HookName[] = ["pre-commit", "pre-push", "commit-msg"];

/**
 * Returns true when the hook name is a valid supported hook.
 */
function isHookName(value: string): value is HookName {
  return SUPPORTED_HOOKS.includes(value as HookName);
}

/**
 * Handles the run CLI command.
 */
export async function handleRunCommand(hook: string, hookArg?: string): Promise<void> {
  if (!isHookName(hook)) {
    throw new CommitlensError(
      `[commitlens] Invalid hook "${hook}". Supported hooks: ${SUPPORTED_HOOKS.join(", ")}`,
      "INVALID_HOOK"
    );
  }

  const result = await runPipeline(hook, process.cwd(), hookArg === undefined ? [] : [hookArg]);

  if (result.shouldBlock) {
    process.stderr.write("[commitlens] Hook blocked due to blocking step failure.\n");
    process.exitCode = 1;
  }
}
