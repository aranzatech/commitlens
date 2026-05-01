import { access } from "node:fs/promises";
import path from "node:path";

import { execa } from "execa";

/**
 * Returns true when the current directory has an initialized .git folder.
 */
export async function hasGitRepository(cwd: string): Promise<boolean> {
  const gitDirectoryPath = path.join(cwd, ".git");

  try {
    await access(gitDirectoryPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists paths (repo-relative) staged for the next commit.
 */
export async function listStagedFilePaths(cwd: string): Promise<string[]> {
  if (!(await hasGitRepository(cwd))) {
    return [];
  }

  try {
    const result = await execa("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
      cwd,
      reject: false
    });

    if (result.exitCode !== 0) {
      return [];
    }

    return result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Builds an absolute path for the git hooks directory.
 */
export function getHooksDirectory(cwd: string): string {
  return path.join(cwd, ".git", "hooks");
}
