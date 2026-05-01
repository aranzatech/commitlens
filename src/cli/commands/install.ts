import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { ensureGitUsesDotGitHooks } from "../../core/git-hooks-path.js";
import { hasGitRepository } from "../../core/git.js";
import { installHooks } from "../../core/hook-installer.js";
import { hooksInstalledLine, stderrWarn } from "../../core/terminal-style.js";

const CONFIG_FILE_NAME = "commitlens.config.ts";

/**
 * Handles the install CLI command.
 */
export async function handleInstallCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!(await hasGitRepository(cwd))) {
    stderrWarn("Git is not initialized — skipping hook installation.");
    return;
  }

  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  try {
    await access(configPath);
  } catch {
    stderrWarn("No commitlens.config.ts found — skipping hook installation.");
    return;
  }

  await installHooks(cwd);
  await ensureGitUsesDotGitHooks(cwd);
  process.stdout.write(hooksInstalledLine());
}
