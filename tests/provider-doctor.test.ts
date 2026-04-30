import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { evaluateProviderHealth } from "../src/core/provider-doctor.js";
import type { CommitlensConfig } from "../src/types/config.js";

const tempRoot = path.join(process.cwd(), ".tmp-tests");

describe("evaluateProviderHealth", () => {
  it("marks CLI binary provider as unavailable when binary does not exist", async () => {
    const config: CommitlensConfig = {
      hooks: {},
      providers: {
        "fake-cli": {
          bin: "this-binary-should-not-exist-12345"
        }
      }
    };

    const statuses = await evaluateProviderHealth(config);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.available).toBe(false);
  });

  it("marks custom script as available when executable", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-doctor-script-"));
    const scriptPath = path.join(cwd, "reviewer.sh");

    try {
      await writeFile(scriptPath, "#!/bin/sh\nexit 0\n", { encoding: "utf8", mode: 0o755 });
      const config: CommitlensConfig = {
        hooks: {},
        providers: {
          custom: {
            script: scriptPath
          }
        }
      };

      const statuses = await evaluateProviderHealth(config);
      expect(statuses).toHaveLength(1);
      expect(statuses[0]?.available).toBe(true);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
