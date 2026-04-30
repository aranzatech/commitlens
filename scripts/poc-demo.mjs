import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { execa, execaCommand } from "execa";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "commitlens-poc-"));

try {
  console.log(`[commitlens-demo] Working directory: ${tempDir}`);
  await execaCommand("git init", { cwd: tempDir });

  await mkdir(path.join(tempDir, ".commitlens"), { recursive: true });
  await writeFile(path.join(tempDir, "index.ts"), "export const sum = (a: number, b: number): number => a + b;\n", "utf8");

  const customReviewerPath = path.join(tempDir, ".commitlens", "my-reviewer.sh");
  await writeFile(customReviewerPath, "#!/bin/sh\necho OK\n", "utf8");
  await chmod(customReviewerPath, 0o755);

  await writeFile(
    path.join(tempDir, "commitlens.config.ts"),
    `export default {
  provider: "custom",
  fallback: [],
  hooks: {
    "pre-commit": {
      steps: [
        { name: "smoke-check", type: "command", run: "node -e \\"process.exit(0)\\"", blocking: true },
        { name: "ai-review", type: "ai", blocking: false, prompt: "Reply OK if everything is fine." }
      ]
    },
    "commit-msg": {
      steps: [
        { name: "cc", type: "commit-msg", format: "conventional-commits", blocking: true }
      ]
    }
  },
  providers: {
    custom: { script: ".commitlens/my-reviewer.sh" }
  }
};
`,
    "utf8"
  );

  const commitlensBinPath = path.join(projectRoot, "bin", "commitlens.js");
  await execa("node", [commitlensBinPath, "install"], { cwd: tempDir });
  await execa("node", [commitlensBinPath, "run", "pre-commit"], { cwd: tempDir, stdio: "inherit" });

  const commitMsgPath = path.join(tempDir, "COMMIT_EDITMSG");
  await writeFile(commitMsgPath, "feat(core): add poc pipeline\n", "utf8");
  await execa("node", [commitlensBinPath, "run", "commit-msg", commitMsgPath], {
    cwd: tempDir,
    stdio: "inherit"
  });

  console.log("[commitlens-demo] PoC demo finished successfully.");
} catch (error) {
  console.error(`[commitlens-demo] Demo failed: ${String(error)}`);
  process.exitCode = 1;
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
