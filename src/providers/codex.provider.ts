import { execa, execaCommand } from "execa";

import { inferPassFromReviewOutput } from "../core/review-pass.js";
import { ProviderError } from "../errors/provider-error.js";
import type { ProviderConfig } from "../types/config.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

function resolveAiTimeoutMs(): number {
  const raw = process.env.COMMITLENS_AI_TIMEOUT_MS;
  if (raw === undefined || raw === "") return 180_000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 180_000;
}

export class CodexProvider implements AIProvider {
  public readonly name = "codex";
  private readonly binary: string;
  private readonly model: string | undefined;

  public constructor(providerConfig?: ProviderConfig) {
    this.binary = providerConfig?.bin ?? "codex";
    this.model = providerConfig?.model?.trim();
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
    const prompt = `${input.prompt}\nFiles: ${input.files.join(", ")}`;
    const timeoutMs = resolveAiTimeoutMs();

    const args: string[] = ["--approval-mode", "full-auto"];
    if (this.model !== undefined && this.model !== "") {
      args.push("--model", this.model);
    }
    args.push(prompt);

    try {
      const result = await execa(this.binary, args, {
        timeout: timeoutMs,
        reject: false,
        stdin: "ignore"
      });

      if (result.timedOut === true) {
        throw new ProviderError(
          `[commitlens] codex provider timed out after ${timeoutMs}ms (set COMMITLENS_AI_TIMEOUT_MS to adjust)`,
          "CODEX_PROVIDER_FAILED"
        );
      }

      if (result.exitCode !== 0) {
        const hint =
          result.stderr.trim() !== ""
            ? result.stderr.trim().slice(0, 2_000)
            : result.stdout.trim().slice(0, 2_000) || `exit code ${String(result.exitCode)}`;
        throw new ProviderError(`[commitlens] codex provider failed: ${hint}`, "CODEX_PROVIDER_FAILED");
      }

      const output = result.stdout.trim();
      return {
        message: output.length > 0 ? output : "No response from codex provider",
        passed: inferPassFromReviewOutput(output)
      };
    } catch (error: unknown) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        `[commitlens] codex provider failed: ${String(error)}`,
        "CODEX_PROVIDER_FAILED"
      );
    }
  }
}
