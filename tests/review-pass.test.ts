import { describe, expect, it } from "vitest";

import { inferPassFromReviewOutput } from "../src/core/review-pass.js";

describe("inferPassFromReviewOutput", () => {
  it("accepts common OK variants", () => {
    expect(inferPassFromReviewOutput("OK")).toBe(true);
    expect(inferPassFromReviewOutput("ok")).toBe(true);
    expect(inferPassFromReviewOutput("OK.")).toBe(true);
    expect(inferPassFromReviewOutput("OK!\n")).toBe(true);
    expect(inferPassFromReviewOutput("LGTM")).toBe(true);
  });

  it("rejects empty or non-clear responses", () => {
    expect(inferPassFromReviewOutput("")).toBe(false);
    expect(inferPassFromReviewOutput("   ")).toBe(false);
    expect(inferPassFromReviewOutput("Found 2 issues")).toBe(false);
    expect(inferPassFromReviewOutput("OK but see below\nissues")).toBe(false);
    expect(inferPassFromReviewOutput("OK, here are some notes")).toBe(false);
  });
});
