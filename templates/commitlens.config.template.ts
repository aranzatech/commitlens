import { defineConfig } from "@aranzatech/commitlens";

export default defineConfig({
  ai: {
    enabled: true,
    showReviewOutput: true,
    streamModelOutput: false,
  },

  /**
   * Priority order — commitlens tries each provider left to right,
   * skipping any that are unavailable (binary not found / no API key).
   *
   * Recommended order:
   *   1. Local CLI providers  (free, no API key): claude-code, codex
   *   2. API key providers    (paid):              claude-api, openai, gemini
   */
  provider: "claude-code",
  fallback: ["codex", "claude-api", "openai", "gemini"],

  hooks: {
    "pre-commit": {
      steps: [
        {
          blocking: false,
          name: "lint",
          run: "eslint --ext .ts,.tsx src/",
          type: "command",
        },
        {
          blocking: false,
          filePatterns: ["*.ts", "*.tsx", "*.js", "*.jsx"],
          name: "ai-review",
          prompt:
            "Review staged files for bugs, security issues, and missing error handling. Reply OK if everything looks good.",
          type: "ai",
        },
      ],
    },
    "pre-push": {
      steps: [
        {
          blocking: true,
          name: "tests",
          run: "vitest run",
          type: "command",
        },
      ],
    },
    "commit-msg": {
      steps: [
        {
          blocking: false,
          format: "conventional-commits",
          name: "conventional-commits",
          type: "commit-msg",
        },
      ],
    },
  },

  providers: {
    // ── Local CLI providers ──────────────────────────────────────────────
    "claude-code": {
      bin: "claude",                 // requires: `npm i -g @anthropic-ai/claude-code`
      model: "claude-sonnet-4-5",    // or "claude-opus-4-5", "claude-haiku-4-5", etc.
      allowedTools: ["Read"],
    },
    codex: {
      bin: "codex",                  // requires: `npm i -g @openai/codex`
      model: "gpt-4.1",             // or "gpt-4o", "o4-mini", etc.
    },

    // ── API key providers ────────────────────────────────────────────────
    // API keys can be set inline (not recommended for shared repos)
    // or via environment variables (recommended).
    "claude-api": {
      // apiKey: "sk-ant-...",       // or set ANTHROPIC_API_KEY in env
      model: "claude-sonnet-4-5",
    },
    openai: {
      // apiKey: "sk-...",           // or set OPENAI_API_KEY in env
      model: "gpt-4o",
    },
    gemini: {
      // apiKey: "AIza...",          // or set GEMINI_API_KEY in env
      model: "gemini-2.0-flash",
    },
  },
});
