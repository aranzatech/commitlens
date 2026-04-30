import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, it } from "vitest";

import { handleInitCommand } from "../src/cli/commands/init.js";

const originalCwd = process.cwd();
const tempRoot = path.join(originalCwd, ".tmp-tests");

afterEach(() => {
  process.chdir(originalCwd);
});

describe("handleInitCommand", () => {
  it("creates commitlens.config.ts from local template", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-init-"));

    try {
      process.chdir(cwd);
      await handleInitCommand();

      const createdConfig = await readFile(path.join(cwd, "commitlens.config.ts"), "utf8");
      expect(createdConfig).toContain("defineConfig");
      expect(createdConfig).toContain('"pre-commit"');
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
