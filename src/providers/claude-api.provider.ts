import { inferPassFromReviewOutput } from "../core/review-pass.js";
import { aiStreamBannerEnd, aiStreamBannerStart } from "../core/terminal-style.js";
import { ProviderError } from "../errors/provider-error.js";
import type { ProviderConfig } from "../types/config.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function resolveTimeoutMs(): number {
  const raw = process.env.COMMITLENS_AI_TIMEOUT_MS;
  if (raw === undefined || raw === "") return 60_000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

function buildPrompt(input: ReviewInput): string {
  if (input.diff !== undefined && input.diff.trim() !== "") {
    return `${input.prompt}\n\nFiles: ${input.files.join(", ")}\n\nDiff:\n\`\`\`diff\n${input.diff}\n\`\`\``;
  }
  return `${input.prompt}\nFiles: ${input.files.join(", ")}`;
}

export class ClaudeApiProvider implements AIProvider {
  public readonly name = "claude-api";
  private readonly apiKey: string | undefined;
  private readonly model: string;

  public constructor(providerConfig?: ProviderConfig) {
    this.apiKey = providerConfig?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = providerConfig?.model?.trim() || DEFAULT_MODEL;
  }

  public async isAvailable(): Promise<boolean> {
    return this.apiKey !== undefined && this.apiKey.length > 0;
  }

  public async review(input: ReviewInput): Promise<ReviewResult> {
    if (this.apiKey === undefined || this.apiKey === "") {
      throw new ProviderError(
        "[commitlens] claude-api: missing API key. Set ANTHROPIC_API_KEY or providers['claude-api'].apiKey",
        "CLAUDE_API_PROVIDER_FAILED"
      );
    }

    return input.streamToConsole === true
      ? this.reviewStreaming(input)
      : this.reviewBuffered(input);
  }

  private async reviewBuffered(input: ReviewInput): Promise<ReviewResult> {
    const timeoutMs = resolveTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": this.apiKey!,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: buildPrompt(input) }]
        })
      });

      const data = await response.json() as AnthropicResponse;
      if (!response.ok) {
        const msg = data.error?.message ?? `HTTP ${String(response.status)}`;
        throw new ProviderError(`[commitlens] claude-api: ${msg}`, "CLAUDE_API_PROVIDER_FAILED");
      }

      const output = data.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
      return {
        message: output.length > 0 ? output : "No response from claude-api provider",
        passed: inferPassFromReviewOutput(output)
      };
    } catch (error: unknown) {
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ProviderError(`[commitlens] claude-api provider failed: ${msg}`, "CLAUDE_API_PROVIDER_FAILED");
    } finally {
      clearTimeout(timer);
    }
  }

  private async reviewStreaming(input: ReviewInput): Promise<ReviewResult> {
    const timeoutMs = resolveTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

    process.stdout.write(aiStreamBannerStart());

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": this.apiKey!,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          stream: true,
          messages: [{ role: "user", content: buildPrompt(input) }]
        })
      });

      if (!response.ok || response.body === null) {
        const text = await response.text().catch(() => "");
        throw new ProviderError(
          `[commitlens] claude-api: HTTP ${String(response.status)} ${text.slice(0, 300)}`,
          "CLAUDE_API_PROVIDER_FAILED"
        );
      }

      let fullText = "";
      let lineBuf = "";
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuf += decoder.decode(value, { stream: true });
        const lines = lineBuf.split("\n");
        lineBuf = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const json = trimmed.slice(5).trim();
          if (json === "[DONE]" || json === "") continue;

          try {
            const evt = JSON.parse(json) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta.text) {
              process.stdout.write(evt.delta.text);
              fullText += evt.delta.text;
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }

      process.stdout.write(aiStreamBannerEnd());
      const output = fullText.trim();
      return {
        message: output.length > 0 ? output : "No response from claude-api provider",
        passed: inferPassFromReviewOutput(output)
      };
    } catch (error: unknown) {
      process.stdout.write(aiStreamBannerEnd());
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ProviderError(`[commitlens] claude-api provider failed: ${msg}`, "CLAUDE_API_PROVIDER_FAILED");
    } finally {
      clearTimeout(timer);
    }
  }
}
