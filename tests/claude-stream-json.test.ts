import { describe, expect, it } from "vitest";

import {
  plainTextFromStreamJsonStdout,
  streamJsonLineToTerminalPreview
} from "../src/providers/claude-stream-json.js";

describe("claude-stream-json helpers", () => {
  it("extracts nested text fragments", () => {
    const line = JSON.stringify({ delta: { text: "OK" } });
    expect(streamJsonLineToTerminalPreview(line)).toBe("OK");
    expect(plainTextFromStreamJsonStdout(`${line}\n`)).toBe("OK");
  });

  it("concatenates multiple lines", () => {
    const raw = [`{"text":"Hello"}`, `{"text":" world"}`, ""].join("\n");
    expect(plainTextFromStreamJsonStdout(raw)).toBe("Hello world");
  });
});
