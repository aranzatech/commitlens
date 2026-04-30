# Changelog

All notable changes to this project will be documented in this file.

## 0.1.1

- Add optional AI toggle through `ai.enabled` in config.
- Skip AI steps cleanly when AI is disabled, without warnings or blocking.
- Update template and README to document "free mode" without AI evaluation.
- Add test coverage for disabled-AI behavior in both step-level and pipeline-level flows.

## 0.1.0

- Bootstrap project with strict TypeScript, tsup build, vitest tests, and CLI wiring.
- Implement core pipeline runner with `blocking` and `non-blocking` behavior.
- Add operational commands: `init`, `install`, and `doctor`.
- Add AI provider foundation with `custom` and `claude-code` providers plus fallback flow.
- Add commit message validation step for conventional commits.
- Add integration and regression tests for CLI, hooks, providers, and pipeline behavior.
- Add PoC documentation, CI workflow, and repeatable demo script.
