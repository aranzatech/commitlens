import { inferPassFromReviewOutput } from "../core/review-pass.js";
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

    const prompt = `${input.prompt}\nFiles: ${input.files.join(", ")}`;
    const timeoutMs = resolveTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }]
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
}
