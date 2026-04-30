import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, it } from "vitest";

import { handleInstallCommand } from "../src/cli/commands/install.js";

const originalCwd = process.cwd();
const tempRoot = path.join(originalCwd, ".tmp-tests");

afterEach(() => {
  process.chdir(originalCwd);
});

describe("handleInstallCommand", () => {
  it("skips when git is not initialized", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-install-nogit-"));

    try {
      process.chdir(cwd);
      await handleInstallCommand();
      await expect(readFile(path.join(cwd, ".git", "hooks", "pre-commit"), "utf8")).rejects.toThrow();
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("installs hook scripts when git and config exist", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-install-ok-"));

    try {
      await mkdir(path.join(cwd, ".git"));
      await writeFile(path.join(cwd, "commitlens.config.ts"), "export default { hooks: {} };", "utf8");

      process.chdir(cwd);
      await handleInstallCommand();

      const preCommitHook = await readFile(path.join(cwd, ".git", "hooks", "pre-commit"), "utf8");
      const prePushHook = await readFile(path.join(cwd, ".git", "hooks", "pre-push"), "utf8");
      const commitMsgHook = await readFile(path.join(cwd, ".git", "hooks", "commit-msg"), "utf8");

      expect(preCommitHook).toContain("npx commitlens run pre-commit");
      expect(prePushHook).toContain("npx commitlens run pre-push");
      expect(commitMsgHook).toContain("npx commitlens run commit-msg \"$1\"");
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
