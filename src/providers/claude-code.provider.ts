import { execa, execaCommand } from "execa";

import { inferPassFromReviewOutput } from "../core/review-pass.js";
import { aiStreamBannerEnd, aiStreamBannerStart } from "../core/terminal-style.js";
import type { ProviderConfig } from "../types/config.js";
import { ProviderError } from "../errors/provider-error.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

import {
  plainTextFromStreamJsonStdout,
  streamJsonLineToTerminalPreview
} from "./claude-stream-json.js";

function resolveAiTimeoutMs(): number {
  const raw = process.env.COMMITLENS_AI_TIMEOUT_MS;
  if (raw === undefined || raw === "") {
    return 180_000;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 180_000;
}

function formatSpawnFailure(error: unknown, timeoutMs: number): string {
  if (error === null || typeof error !== "object") {
    return String(error);
  }
  const e = error as { message?: string; shortMessage?: string; stderr?: string; timedOut?: boolean };
  const parts: string[] = [];
  if (e.timedOut === true) {
    parts.push(`timed out after ${timeoutMs}ms (set COMMITLENS_AI_TIMEOUT_MS to adjust)`);
  }
  if (e.shortMessage !== undefined && e.shortMessage !== "") {
    parts.push(e.shortMessage);
  } else if (e.message !== undefined && e.message !== "") {
    parts.push(e.message);
  }
  const stderr = typeof e.stderr === "string" && e.stderr.trim() !== "" ? e.stderr.trim().slice(0, 2_000) : "";
  if (stderr !== "") {
    parts.push(`stderr: ${stderr}`);
  }
  return parts.length > 0 ? parts.join(" | ") : String(error);
}

export class ClaudeCodeProvider implements AIProvider {
  public readonly name = "claude-code";
  private readonly binary: string;
  private readonly providerConfig: ProviderConfig | undefined;

  public constructor(providerConfig?: ProviderConfig) {
    this.providerConfig = providerConfig;
    this.binary = providerConfig?.bin ?? "claude";
  }

  public async isAvailable(): Promise<boolean> {
    try {
      await execaCommand(`command -v ${this.binary}`, { shell: true });
      return true;
    } catch {
      return false;
    }
  }

  private buildHeadlessArgs(prompt: string, streamJson: boolean): string[] {
    const args: string[] = ["--no-session-persistence"];

    const model = this.providerConfig?.model?.trim();
    if (model !== undefined && model !== "") {
      args.push("--model", model);
    }

    const tools = this.providerConfig?.allowedTools;
    if (tools !== undefined && tools.length > 0) {
      args.push("--allowedTools", tools.join(","));
    }

    if (streamJson) {
      args.push("--output-format", "stream-json", "--include-partial-messages");
    }

    args.push("--print", prompt);
    return args;
  }

  public async review(input: ReviewInput): Promise<ReviewResult> {
    const prompt = `${input.prompt}\nFiles: ${input.files.join(", ")}`;
    const timeoutMs = resolveAiTimeoutMs();

    try {
      if (input.streamToConsole !== true) {
        return await this.reviewBuffered(prompt, timeoutMs);
      }

      return await this.reviewStreaming(prompt, timeoutMs);
    } catch (error: unknown) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `[commitlens] claude-code provider failed: ${formatSpawnFailure(error, timeoutMs)}`,
        "CLAUDE_CODE_PROVIDER_FAILED"
      );
    }
  }

  private async reviewBuffered(prompt: string, timeoutMs: number): Promise<ReviewResult> {
    const result = await execa(this.binary, this.buildHeadlessArgs(prompt, false), {
      timeout: timeoutMs,
      reject: false,
      stdin: "ignore"
    });

    if (result.timedOut === true) {
      throw new ProviderError(
        `[commitlens] claude-code provider failed: timed out after ${timeoutMs}ms (set COMMITLENS_AI_TIMEOUT_MS to adjust)`,
        "CLAUDE_CODE_PROVIDER_FAILED"
      );
    }

    if (result.exitCode !== 0) {
      const hint =
        result.stderr.trim() !== ""
          ? result.stderr.trim().slice(0, 2_000)
          : result.stdout.trim().slice(0, 2_000) || `exit code ${String(result.exitCode)}`;
      throw new ProviderError(`[commitlens] claude-code provider failed: ${hint}`, "CLAUDE_CODE_PROVIDER_FAILED");
    }

    const output = result.stdout.trim();

    return {
      message: output.length > 0 ? output : "No response from claude-code provider",
      passed: inferPassFromReviewOutput(output)
    };
  }

  private async reviewStreaming(prompt: string, timeoutMs: number): Promise<ReviewResult> {
    process.stdout.write(aiStreamBannerStart());

    const subprocess = execa(this.binary, this.buildHeadlessArgs(prompt, true), {
      timeout: timeoutMs,
      reject: false,
      stdin: "ignore"
    });

    let rawStdout = "";
    let stderrCollected = "";
    let lineBuf = "";

    subprocess.stdout?.setEncoding("utf8");
    subprocess.stdout?.on("data", (chunk: string) => {
      rawStdout += chunk;
      lineBuf += chunk;
      const lines = lineBuf.split("\n");
      lineBuf = lines.pop() ?? "";
      for (const line of lines) {
        const preview = streamJsonLineToTerminalPreview(line);
        if (preview !== "") {
          process.stdout.write(preview);
        }
      }
    });

    subprocess.stderr?.setEncoding("utf8");
    subprocess.stderr?.on("data", (chunk: string) => {
      stderrCollected += chunk;
      process.stderr.write(chunk);
    });

    const result = await subprocess;

    if (lineBuf.trim() !== "") {
      const preview = streamJsonLineToTerminalPreview(lineBuf);
      if (preview !== "") {
        process.stdout.write(preview);
      }
    }

    process.stdout.write(aiStreamBannerEnd());

    if (result.timedOut === true) {
      throw new ProviderError(
        `[commitlens] claude-code provider failed: timed out after ${timeoutMs}ms (set COMMITLENS_AI_TIMEOUT_MS to adjust)`,
        "CLAUDE_CODE_PROVIDER_FAILED"
      );
    }

    if (result.exitCode !== 0) {
      const hint =
        stderrCollected.trim() !== ""
          ? stderrCollected.trim().slice(0, 2_000)
          : rawStdout.trim().slice(0, 2_000) || `exit code ${String(result.exitCode)}`;
      throw new ProviderError(`[commitlens] claude-code provider failed: ${hint}`, "CLAUDE_CODE_PROVIDER_FAILED");
    }

    const plain = plainTextFromStreamJsonStdout(rawStdout);
    const fallbackStdout = rawStdout.trim();
    const output =
      plain.trim() !== "" ? plain.trim() : fallbackStdout.length > 0 ? fallbackStdout : stderrCollected.trim();

    const inferSource = plain.trim() !== "" ? plain.trim() : fallbackStdout;

    return {
      message: output.length > 0 ? output : "No response from claude-code provider",
      passed: inferPassFromReviewOutput(inferSource)
    };
  }
}
