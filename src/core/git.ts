import { access } from "node:fs/promises";
import path from "node:path";

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
 * Builds an absolute path for the git hooks directory.
 */
export function getHooksDirectory(cwd: string): string {
  return path.join(cwd, ".git", "hooks");
}
