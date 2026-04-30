import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { installHooks } from "../../core/hook-installer.js";
import { hasGitRepository } from "../../core/git.js";

const CONFIG_FILE_NAME = "commitlens.config.ts";

/**
 * Handles the install CLI command.
 */
export async function handleInstallCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!(await hasGitRepository(cwd))) {
    console.warn("[commitlens] Git is not initialized. Skipping hook installation.");
    return;
  }

  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  try {
    await access(configPath);
  } catch {
    console.warn("[commitlens] No commitlens.config.ts found. Skipping hook installation.");
    return;
  }

  await installHooks(cwd);
  process.stdout.write("[commitlens] Hooks installed in .git/hooks.\n");
}
