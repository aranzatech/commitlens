import { readFile } from "node:fs/promises";
import path from "node:path";

import { createProvider } from "../core/provider-factory.js";
import { filterPathsByPatterns } from "../core/file-patterns.js";
import { getStagedDiff } from "../core/git.js";
import { listStagedFilePaths } from "../core/git.js";
import {
  DEFAULT_MAX_LINES_PER_FILE,
  DEFAULT_MAX_TOTAL_LINES,
  filterIgnoredFiles,
  truncateDiff
} from "../core/diff-filter.js";
import { buildCacheKey, readReviewCache, writeReviewCache } from "../core/review-cache.js";
import { aiStepCalling } from "../core/terminal-style.js";
import type { AiStepConfig, CommitlensConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";

const DEFAULT_PROMPT =
  "Review staged changes for bugs and security issues. Reply exactly OK if no issues are found.";

export interface RunAiStepOptions {
  /** When set, skip reading git index and use this list instead (tests). */
  filesOverride?: string[];
  /** Run the provider even with no staged files (e.g. `commitlens ai-ping`). */
  forceWithoutStaged?: boolean;
  /** Inject a diff string directly (tests). */
  diffOverride?: string;
}

export async function runAiStep(
  step: AiStepConfig,
  config: CommitlensConfig,
  cwd: string,
  options?: RunAiStepOptions
): Promise<StepResult> {
  if (config.ai?.enabled === false) {
    return { message: "AI is disabled by config. Skipping AI review step.", passed: true };
  }

  let rawPaths: string[];
  if (options?.forceWithoutStaged === true) {
    rawPaths = options.filesOverride ?? [];
  } else {
    rawPaths = options?.filesOverride ?? (await listStagedFilePaths(cwd));
    if (rawPaths.length === 0) {
      return {
        message:
          "No staged files to review. Stage changes with `git add` or run `commitlens ai-ping` to test the provider.",
        passed: true
      };
    }
  }

  // Layer 1 — filePatterns filter (existing)
  const patternFiltered = filterPathsByPatterns(rawPaths, step.filePatterns);

  if (options?.forceWithoutStaged !== true && rawPaths.length > 0 && patternFiltered.length === 0) {
    return {
      message: `No staged files match filePatterns (${(step.filePatterns ?? []).join(", ") || "none"}); nothing to review.`,
      passed: true
    };
  }

  // Layer 2 — filter out lock files, build artifacts, minified files
  const files = filterIgnoredFiles(patternFiltered);
  if (patternFiltered.length > 0 && files.length === 0) {
    return {
      message: "All staged files are in the ignored list (lock files, build artifacts). Skipping AI review.",
      passed: true
    };
  }

  // Resolve prompt (promptFile takes precedence over inline prompt)
  const prompt = await resolvePrompt(step, cwd);

  // Layers 3 & 4 — get diff and truncate
  const maxLinesPerFile = step.maxLinesPerFile ?? DEFAULT_MAX_LINES_PER_FILE;
  const maxTotalLines = step.maxDiffLines ?? DEFAULT_MAX_TOTAL_LINES;

  const rawDiff = options?.diffOverride ?? (options?.forceWithoutStaged !== true
    ? await getStagedDiff(files, cwd)
    : "");

  const { diff, truncated } = truncateDiff(rawDiff, maxLinesPerFile, maxTotalLines);

  if (rawDiff.length > 0 && diff.trim() === "") {
    return {
      message: "Staged diff is empty after filtering. Skipping AI review.",
      passed: true
    };
  }

  // Cache check — skip provider call if this exact diff + prompt was already reviewed
  const cacheKey = buildCacheKey(step.name, prompt, diff);
  if (diff !== "") {
    const cached = await readReviewCache(cacheKey, cwd);
    if (cached !== null) {
      return {
        message: `${cached.passed ? "✓" : "✗"} ${step.name} (cached): ${cached.message}`,
        passed: cached.passed
      };
    }
  }

  const selectedProviderNames = collectProviderOrder(config);

  for (const providerName of selectedProviderNames) {
    const provider = createProvider(providerName, config.providers?.[providerName]);
    if (provider === null) continue;

    const available = await provider.isAvailable();
    if (!available) continue;

    process.stdout.write(aiStepCalling(step.name, providerName));

    const streamToConsole =
      step.streamModelOutput === true ||
      (step.streamModelOutput !== false && config.ai?.streamModelOutput === true);

    try {
      const reviewResult = await provider.review({
        diff: diff !== "" ? buildDiffContext(diff, truncated) : undefined,
        files,
        prompt,
        streamToConsole
      });

      // Persist to cache only on clean results (not errors)
      if (diff !== "") {
        await writeReviewCache(cacheKey, { message: reviewResult.message, passed: reviewResult.passed }, cwd);
      }

      return {
        message: `${provider.name}: ${reviewResult.message}`,
        passed: reviewResult.passed
      };
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      return { message: `${provider.name}: ${detail}`, passed: false };
    }
  }

  return {
    forceWarning: true,
    message: "No AI provider available. Skipping AI review without blocking.",
    passed: false
  };
}

async function resolvePrompt(step: AiStepConfig, cwd: string): Promise<string> {
  if (step.promptFile !== undefined) {
    try {
      const content = await readFile(path.join(cwd, step.promptFile), "utf8");
      const trimmed = content.trim();
      if (trimmed.length > 0) return trimmed;
    } catch {
      // Fall through to inline prompt
    }
  }
  return step.prompt ?? DEFAULT_PROMPT;
}

function buildDiffContext(diff: string, truncated: boolean): string {
  return truncated ? `${diff}\n\n[diff truncated — partial view only]` : diff;
}

function collectProviderOrder(config: CommitlensConfig): string[] {
  const order: string[] = [];
  if (config.provider !== undefined) order.push(config.provider);
  if (config.fallback !== undefined) {
    for (const name of config.fallback) {
      if (!order.includes(name)) order.push(name);
    }
  }
  return order;
}
