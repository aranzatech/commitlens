import { access } from "node:fs/promises";

import { execaCommand } from "execa";

import { inferPassFromReviewOutput } from "../core/review-pass.js";
import { ProviderError } from "../errors/provider-error.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

export class CustomProvider implements AIProvider {
  public readonly name = "custom";
  private readonly scriptPath: string;

  public constructor(scriptPath: string) {
    this.scriptPath = scriptPath;
  }

  public async isAvailable(): Promise<boolean> {
    try {
      await access(this.scriptPath);
      return true;
    } catch {
      return false;
    }
  }

  public async review(input: ReviewInput): Promise<ReviewResult> {
    try {
      const response = await execaCommand(`"${this.scriptPath}"`, {
        env: {
          COMMITLENS_FILES: input.files.join(","),
          COMMITLENS_PROMPT: input.prompt
        },
        shell: true
      });
      const output = response.stdout.trim();

      return {
        message: output.length > 0 ? output : "No output from custom provider",
        passed: inferPassFromReviewOutput(output)
      };
    } catch (error: unknown) {
      throw new ProviderError(`[commitlens] custom provider failed: ${String(error)}`, "CUSTOM_PROVIDER_FAILED");
    }
  }
}
