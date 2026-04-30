import { execaCommand } from "execa";

import { ProviderError } from "../errors/provider-error.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

export class ClaudeCodeProvider implements AIProvider {
  public readonly name = "claude-code";
  private readonly binary: string;

  public constructor(binary = "claude") {
    this.binary = binary;
  }

  public async isAvailable(): Promise<boolean> {
    try {
      await execaCommand(`command -v ${this.binary}`, { shell: true });
      return true;
    } catch {
      return false;
    }
  }

  public async review(input: ReviewInput): Promise<ReviewResult> {
    try {
      const prompt = `${input.prompt}\nFiles: ${input.files.join(", ")}`;
      const result = await execaCommand(`${this.binary} --print ${JSON.stringify(prompt)}`, { shell: true });
      const output = result.stdout.trim();

      return {
        message: output.length > 0 ? output : "No response from claude-code provider",
        passed: output === "OK"
      };
    } catch (error: unknown) {
      throw new ProviderError(
        `[commitlens] claude-code provider failed: ${String(error)}`,
        "CLAUDE_CODE_PROVIDER_FAILED"
      );
    }
  }
}
