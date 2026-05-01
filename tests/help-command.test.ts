import { describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli/index.js";

describe("commitlens help", () => {
  it("prints global usage including commands", () => {
    const logs: string[] = [];
    const spyLog = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    try {
      runCli(["node", "commitlens", "help"]);
    } finally {
      spyLog.mockRestore();
    }

    const out = logs.join("\n");
    expect(out).toContain("commitlens");
    expect(out).toContain("init");
    expect(out).toContain("install");
    expect(out).toContain("ai-ping");
    expect(out).toContain("help");
  });
});
