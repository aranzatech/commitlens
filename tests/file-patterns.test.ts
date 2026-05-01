import { describe, expect, it } from "vitest";

import { filterPathsByPatterns, matchesFilePattern } from "../src/core/file-patterns.js";

describe("matchesFilePattern", () => {
  it("matches *.ext against nested paths", () => {
    expect(matchesFilePattern("src/foo.ts", "*.ts")).toBe(true);
    expect(matchesFilePattern("src/foo.tsx", "*.ts")).toBe(false);
    expect(matchesFilePattern("src/foo.tsx", "*.tsx")).toBe(true);
  });
});

describe("filterPathsByPatterns", () => {
  it("returns all paths when patterns omitted", () => {
    expect(filterPathsByPatterns(["a.ts", "b.js"], undefined)).toEqual(["a.ts", "b.js"]);
  });

  it("filters by patterns", () => {
    expect(filterPathsByPatterns(["a.ts", "b.js", "c.tsx"], ["*.ts", "*.tsx"])).toEqual(["a.ts", "c.tsx"]);
  });
});
