# @aranzatech/commitlens

[![npm version](https://img.shields.io/npm/v/@aranzatech/commitlens.svg)](https://www.npmjs.com/package/@aranzatech/commitlens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**AI-ready git hook orchestrator for JavaScript and TypeScript projects.**

Run lint, tests, conventional commit validation, and AI code review in a single configurable pipeline — with per-step `blocking` vs `warning` semantics and automatic provider fallback.

> Works without AI too. Disable it entirely and keep only classic pipeline checks.

---

## Features

- **Hook pipeline** for `pre-commit`, `pre-push`, and `commit-msg`
- **Three step types:** `command`, `ai`, and `commit-msg`
- **Six AI providers** with automatic priority + fallback order
- **No API key required** when using local CLI providers (`claude-code`, `codex`)
- **Per-step blocking rules:** `blocking: true` fails the hook, `blocking: false` warns and continues
- **Automatic hook installation** into `.git/hooks` (no Husky required)
- **Provider health check** via `commitlens doctor`
- **Conventional commit validation** out of the box

---

## Requirements

- **Node.js** ≥ 18
- **Git** repository (for hook installation)
- **AI (optional):** one of the supported providers configured and available

---

## Installation

```bash
npm install -D @aranzatech/commitlens
```

Add this to your `package.json` so hooks are installed automatically after `npm install`:

```json
{
  "scripts": {
    "prepare": "commitlens install"
  }
}
```

`prepare` exits gracefully when there is no `.git` folder or config file — safe for CI and Docker builds.

---

## Quickstart

### 1. Scaffold config

```bash
npx commitlens init
```

Creates `commitlens.config.ts` from the built-in template.

### 2. Install git hooks

```bash
npx commitlens install
```

Writes hook scripts into `.git/hooks`. If you previously used **Husky**, commitlens clears `core.hooksPath` automatically so `.git/hooks` takes effect.

### 3. Check provider availability

```bash
npx commitlens doctor
```

### 4. Smoke-test the AI provider (no commit needed)

```bash
npx commitlens ai-ping
```

### 5. Run a hook pipeline manually

```bash
git add path/to/file.ts
npx commitlens run pre-commit
```

### 6. Normal workflow

```bash
git add .
git commit -m "feat: my change"
```

---

## AI Providers

commitlens supports **six providers** in two categories. Configure the priority order via `provider` (primary) and `fallback` (ordered list).

### Local CLI providers — no API key required

These run a local binary on your machine. commitlens checks if the binary exists; if not, it moves to the next provider.

| Name | Binary | Install |
|------|--------|---------|
| `claude-code` | `claude` | `npm i -g @anthropic-ai/claude-code` |
| `codex` | `codex` | `npm i -g @openai/codex` |

### API key providers

These call a remote API. commitlens checks for the API key (from config or environment variable); if missing, it moves to the next provider.

| Name | API | Environment variable |
|------|-----|----------------------|
| `claude-api` | Anthropic Messages API | `ANTHROPIC_API_KEY` |
| `openai` | OpenAI Chat Completions | `OPENAI_API_KEY` |
| `gemini` | Google Gemini API | `GEMINI_API_KEY` |

### Custom script

```ts
"custom": {
  script: ".commitlens/my-reviewer.sh"
}
```

Any executable script. Receives staged files and prompt via `COMMITLENS_FILES` and `COMMITLENS_PROMPT` environment variables. Must print a review to stdout and exit `0`.

---

## Priority and fallback

commitlens tries providers **left to right**, skipping any that are unavailable:

```ts
provider: "claude-code",            // tried first
fallback: ["codex", "claude-api", "openai", "gemini"],
```

If no provider is available, the `ai` step issues a **warning** and does not block the commit by default.

You can reorder freely:

```ts
provider: "codex",
fallback: ["claude-code", "openai"],
```

---

## Configuration reference

### Full example

```ts
import { defineConfig } from "@aranzatech/commitlens";

export default defineConfig({
  ai: {
    enabled: true,
    showReviewOutput: true,
    streamModelOutput: false,
  },

  provider: "claude-code",
  fallback: ["codex", "claude-api", "openai", "gemini"],

  hooks: {
    "pre-commit": {
      steps: [
        {
          name: "lint",
          type: "command",
          run: "eslint --ext .ts,.tsx src/",
          blocking: false,
        },
        {
          name: "ai-review",
          type: "ai",
          blocking: false,
          filePatterns: ["*.ts", "*.tsx", "*.js", "*.jsx"],
          prompt: "Review staged files for bugs and security issues. Reply OK if everything looks good.",
        },
      ],
    },
    "pre-push": {
      steps: [
        {
          name: "tests",
          type: "command",
          run: "vitest run",
          blocking: true,
        },
      ],
    },
    "commit-msg": {
      steps: [
        {
          name: "conventional-commits",
          type: "commit-msg",
          format: "conventional-commits",
          blocking: false,
        },
      ],
    },
  },

  providers: {
    // Local CLI
    "claude-code": {
      bin: "claude",
      model: "claude-sonnet-4-5",
      allowedTools: ["Read"],
    },
    codex: {
      bin: "codex",
      model: "gpt-4.1",
    },
    // API key — set via env var or inline (env var recommended for shared repos)
    "claude-api": {
      // apiKey: "sk-ant-...",  or set ANTHROPIC_API_KEY
      model: "claude-sonnet-4-5",
    },
    openai: {
      // apiKey: "sk-...",      or set OPENAI_API_KEY
      model: "gpt-4o",
    },
    gemini: {
      // apiKey: "AIza...",     or set GEMINI_API_KEY
      model: "gemini-2.0-flash",
    },
  },
});
```

### `ai` options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Set `false` to skip all AI steps globally |
| `showReviewOutput` | `boolean` | `false` | Print the provider reply even when the step passes |
| `streamModelOutput` | `boolean` | `false` | Stream model output live (only `claude-code`; louder, slower) |

### Step types

**`command`**

```ts
{
  name: "lint",
  type: "command",
  run: "eslint src/",
  blocking: true,
}
```

**`ai`**

```ts
{
  name: "ai-review",
  type: "ai",
  blocking: false,
  filePatterns: ["*.ts", "*.tsx"],   // optional — filters staged files
  prompt: "Review for bugs. Reply OK if all good.",
  streamModelOutput: true,            // override global setting for this step
}
```

**`commit-msg`**

```ts
{
  name: "conventional-commits",
  type: "commit-msg",
  format: "conventional-commits",
  blocking: true,
}
```

### `blocking` behavior

| Value | Effect |
|-------|--------|
| `true` | Failure blocks the commit and exits non-zero |
| `false` | Failure prints a warning; pipeline continues |

---

## CLI reference

| Command | Description |
|---------|-------------|
| `commitlens init` | Create `commitlens.config.ts` from template |
| `commitlens install` | Install hook scripts into `.git/hooks` |
| `commitlens run <hook> [arg]` | Run `pre-commit`, `pre-push`, or `commit-msg` manually |
| `commitlens doctor` | Report availability of all configured providers |
| `commitlens ai-ping` | Send a minimal request to validate AI provider connectivity |
| `commitlens help` | Print help (`--help` / `-h` also work) |

Run `commit-msg` manually (matches Git's own invocation):

```bash
npx commitlens run commit-msg .git/COMMIT_EDITMSG
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMMITLENS_AI_TIMEOUT_MS` | `180000` (CLI) / `60000` (API) | Timeout for AI provider calls |
| `ANTHROPIC_API_KEY` | — | API key for the `claude-api` provider |
| `OPENAI_API_KEY` | — | API key for the `openai` provider |
| `GEMINI_API_KEY` | — | API key for the `gemini` provider |
| `NO_COLOR` | — | Disable ANSI colors in commitlens output |

---

## Disable AI entirely

```ts
export default defineConfig({
  ai: { enabled: false },
  hooks: {
    "pre-commit": {
      steps: [
        { name: "lint", type: "command", run: "npm run lint", blocking: false },
      ],
    },
  },
});
```

All `ai` steps are skipped; no provider is called.

---

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| Hooks never run after install | Run `git config core.hooksPath` — should be empty. Re-run `commitlens install`. |
| `commitlens install` does nothing | Must have `.git` and `commitlens.config.ts` in the working directory. |
| Pipeline silently skipped | Missing `commitlens.config.ts` — intentional no-op. |
| `ai` step warns "No AI provider available" | Run `commitlens doctor`. Check that at least one provider in the `provider`/`fallback` list is available. |
| AI step hangs or times out | Set `COMMITLENS_AI_TIMEOUT_MS=300000`. For `claude-code`, confirm `claude` is authenticated. |
| API provider returns 401 | Check that the corresponding env var (`ANTHROPIC_API_KEY`, etc.) is exported in the shell that runs Git. |
| `npm publish` 404 on scoped package | Verify org membership and publish rights for `@aranzatech` on npm. |

---

## Development

```bash
git clone https://github.com/aranzatech/commitlens.git
cd commitlens
npm install
npm run typecheck
npm test
npm run build
```

End-to-end local demo (creates a temporary git repo, installs hooks, runs the full pipeline):

```bash
npm run demo:poc
```

---

## License

[MIT](https://opensource.org/licenses/MIT)
