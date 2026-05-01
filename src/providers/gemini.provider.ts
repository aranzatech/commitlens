import { inferPassFromReviewOutput } from "../core/review-pass.js";
import { ProviderError } from "../errors/provider-error.js";
import type { ProviderConfig } from "../types/config.js";
import type { AIProvider, ReviewInput, ReviewResult } from "../types/providers.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function resolveTimeoutMs(): number {
  const raw = process.env.COMMITLENS_AI_TIMEOUT_MS;
  if (raw === undefined || raw === "") return 60_000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  private readonly apiKey: string | undefined;
  private readonly model: string;

  public constructor(providerConfig?: ProviderConfig) {
    this.apiKey = providerConfig?.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = providerConfig?.model?.trim() || DEFAULT_MODEL;
  }

  public async isAvailable(): Promise<boolean> {
    return this.apiKey !== undefined && this.apiKey.length > 0;
  }

  public async review(input: ReviewInput): Promise<ReviewResult> {
    if (this.apiKey === undefined || this.apiKey === "") {
      throw new ProviderError(
        "[commitlens] gemini: missing API key. Set GEMINI_API_KEY or providers.gemini.apiKey",
        "GEMINI_PROVIDER_FAILED"
      );
    }

    const prompt = `${input.prompt}\nFiles: ${input.files.join(", ")}`;
    const timeoutMs = resolveTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
    const url = `${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json() as GeminiResponse;

      if (!response.ok) {
        const msg = data.error?.message ?? `HTTP ${String(response.status)}`;
        throw new ProviderError(`[commitlens] gemini: ${msg}`, "GEMINI_PROVIDER_FAILED");
      }

      const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      return {
        message: output.length > 0 ? output : "No response from gemini provider",
        passed: inferPassFromReviewOutput(output)
      };
    } catch (error: unknown) {
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ProviderError(`[commitlens] gemini provider failed: ${msg}`, "GEMINI_PROVIDER_FAILED");
    } finally {
      clearTimeout(timer);
    }
  }
}
