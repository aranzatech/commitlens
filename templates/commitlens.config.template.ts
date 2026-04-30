import { defineConfig } from "@aranzatech/commitlens";

export default defineConfig({
  fallback: ["claude-api", "openai"],
  hooks: {
    "commit-msg": {
      steps: [
        {
          blocking: false,
          format: "conventional-commits",
          name: "conventional-commits",
          type: "commit-msg"
        }
      ]
    },
    "pre-commit": {
      steps: [
        {
          blocking: false,
          name: "lint",
          run: "eslint --ext .ts,.tsx src/",
          type: "command"
        }
      ]
    },
    "pre-push": {
      steps: [
        {
          blocking: true,
          name: "tests",
          run: "vitest run",
          type: "command"
        }
      ]
    }
  },
  provider: "claude-code",
  providers: {
    "claude-api": {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-5"
    },
    "claude-code": {
      allowedTools: ["Read"],
      bin: "claude",
      model: "claude-sonnet-4-5"
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: "o4-mini"
    }
  }
});
