import { describe, expect, it } from "vitest";

import { defineConfig } from "../src/index.js";

describe("defineConfig", () => {
  it("returns the exact same config object", () => {
    const config = {
      hooks: {
        "pre-commit": {
          steps: []
        }
      }
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
  });
});
