import { execa } from "execa";

import { hooksPathUnsetFailed, hooksPathUnsetOk } from "./terminal-style.js";

/** Husky sets core.hooksPath to a directory under .husky; Git then ignores .git/hooks. */
const HUSKY_HOOKS_PATH = /^\.husky(\/|$)/i;

/**
 * Unsets core.hooksPath when it points at Husky so hooks installed in .git/hooks actually run.
 */
export async function ensureGitUsesDotGitHooks(cwd: string): Promise<void> {
  const current = await execa("git", ["config", "--get", "core.hooksPath"], { cwd, reject: false });
  if (current.exitCode !== 0) {
    return;
  }

  const value = current.stdout.trim();
  if (value === "" || !HUSKY_HOOKS_PATH.test(value)) {
    return;
  }

  const unset = await execa("git", ["config", "--unset", "core.hooksPath"], { cwd, reject: false });
  if (unset.exitCode !== 0) {
    process.stderr.write(hooksPathUnsetFailed(value));
    return;
  }

  process.stdout.write(hooksPathUnsetOk(value));
}
