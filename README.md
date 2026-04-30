# @aranzatech/commitlens

`@aranzatech/commitlens` is an AI-ready quality pipeline orchestrator for git hooks.

It runs configurable steps per hook (`pre-commit`, `pre-push`, `commit-msg`) and applies granular blocking rules:

- `blocking: true` -> fail the hook
- `blocking: false` -> report warning and continue

AI usage is optional. You can disable AI globally and keep only classic pipeline checks.

## Features

- Hook pipeline execution for `pre-commit`, `pre-push`, and `commit-msg`
- Step types: `command`, `ai`, and `commit-msg`
- Automatic hook installation into `.git/hooks`
- Config validation with Zod
- AI provider abstraction with fallback order
- Conventional commit validation for `commit-msg`

## Requirements

- Node.js `>=18`
- Git initialized in the target repository for hook installation

## Quickstart (local development)

```bash
npm install
npm run build
node ./bin/commitlens.js --help
```

## CLI Commands

- `commitlens init` -> creates `commitlens.config.ts` from template
- `commitlens install` -> installs git hooks into `.git/hooks`
- `commitlens run <hook> [hookArg]` -> executes a hook pipeline manually
- `commitlens doctor` -> checks configured provider availability
- `commitlens use <provider>` -> reserved for upcoming provider switching flow

## Configuration Example

Use `commitlens init` to generate the base file.

Minimal `commitlens.config.ts` example:

```ts
import { defineConfig } from "@aranzatech/commitlens";

export default defineConfig({
  ai: {
    enabled: false // Fully disable AI evaluation (free mode)
  },
  provider: "custom",
  fallback: [],
  hooks: {
    "pre-commit": {
      steps: [{ name: "lint", type: "command", run: "npm run lint", blocking: false }]
    },
    "commit-msg": {
      steps: [
        {
          name: "conventional-commits",
          type: "commit-msg",
          format: "conventional-commits",
          blocking: true
        }
      ]
    }
  },
  providers: {
    custom: {
      script: ".commitlens/my-reviewer.sh"
    }
  }
});
```

## PoC Demo

Run an end-to-end local demo:

```bash
npm run build
npm run demo:poc
```

The script creates a temporary git repo, installs hooks, runs `pre-commit`, then validates `commit-msg`.

## Development Commands

```bash
npm run typecheck
npm run test
npm run build
```

## Troubleshooting

- **No `.git` folder**: `commitlens install` exits with warning and does not fail hard.
- **No `commitlens.config.ts`**: pipeline is skipped silently by design.
- **AI provider unavailable**: `ai` steps degrade to warning and do not block by default fallback behavior.
- **Disable AI entirely**: set `ai.enabled = false` and keep `command` / `commit-msg` steps only.
- **commit-msg hook argument**: pass commit message path when invoking manually:
  - `commitlens run commit-msg .git/COMMIT_EDITMSG`
