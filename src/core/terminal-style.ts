import pc from "picocolors";

import type { PipelineCounters } from "../types/pipeline.js";

/** Visible prefix for every commitlens line (TTY-safe via picocolors). */
export function tag(): string {
  return pc.bold(pc.cyan("[commitlens]"));
}

export function dim(text: string): string {
  return pc.dim(text);
}

export function bold(text: string): string {
  return pc.bold(text);
}

export function hookLabel(hook: string): string {
  return pc.bold(pc.magenta(hook));
}

/** Plain informational line with tag (stdout). */
export function infoLine(message: string): string {
  return `${tag()} ${message}\n`;
}

/** Warning tone but still stdout when non-fatal (stdout). */
export function softWarnLine(message: string): string {
  return `${tag()} ${pc.yellow(message)}\n`;
}

/** Stderr warning / recoverable issue. */
export function stderrWarn(message: string): void {
  process.stderr.write(`${tag()} ${pc.yellow(message)}\n`);
}

/** Stderr error. */
export function stderrError(message: string): void {
  process.stderr.write(`${tag()} ${pc.red(message)}\n`);
}

function rule(width = 52): string {
  return pc.dim("─".repeat(width));
}

/** Banner before running a hook pipeline. */
export function pipelineBanner(hook: string): string {
  const r = rule();
  return `\n${r}\n${tag()} ${dim("Running")} ${hookLabel(hook)} ${dim("pipeline")}\n${r}\n`;
}

/** Compact footer after pipeline steps. */
export function pipelineSummaryFooter(counters: PipelineCounters): string {
  const { passed, warnings, errors } = counters;
  const passSeg = pc.green(`passed=${passed}`);
  const warnSeg = warnings > 0 ? pc.yellow(`warnings=${warnings}`) : dim(`warnings=${warnings}`);
  const errSeg = errors > 0 ? pc.red(`errors=${errors}`) : dim(`errors=${errors}`);
  const r = rule();
  return `\n${r}\n${tag()} ${bold("Summary")}  ${passSeg}  ${warnSeg}  ${errSeg}\n${r}\n`;
}

export function stepPassedLine(stepName: string): string {
  return `  ${pc.green("✓")} ${bold(stepName)} ${dim("ok")}\n`;
}

export function stepWarningLine(stepName: string, detail: string): string {
  return `  ${pc.yellow("⚠")} ${bold(stepName)} ${dim("→")} ${pc.yellow(detail)} ${dim("(non-blocking)")}\n`;
}

export function stepBlockingFailLine(stepName: string, detail: string): string {
  return `  ${pc.red("✖")} ${bold(stepName)} ${dim("→")} ${pc.red(detail)} ${dim("(blocking)")}\n`;
}

export function doctorProviderLine(providerName: string, ok: boolean, message: string): string {
  const bullet = ok ? pc.green("●") : pc.red("●");
  return `  ${bullet} ${bold(providerName)}${dim(":")} ${message}\n`;
}

export function aiStepCalling(stepName: string, providerName: string): string {
  return `${tag()} ${dim("AI step")} ${bold(stepName)} ${dim("→")} ${pc.bold(pc.blue(providerName))} ${dim("(may take a while after lint)")}\n`;
}

export function skipHookNoSteps(hook: string): string {
  return `${tag()} ${dim("No steps configured for")} ${hookLabel(hook)} ${dim("— skipping.")}\n`;
}

export function hooksPathUnsetFailed(value: string): string {
  return `${tag()} ${pc.yellow("Warning")} ${dim("— core.hooksPath is")} ${bold(value)} ${dim("so Git ignores .git/hooks.")} ${dim("Run:")} ${pc.cyan("git config --unset core.hooksPath")}\n`;
}

export function hooksPathUnsetOk(value: string): string {
  return `${tag()} ${pc.green("Unset core.hooksPath")} ${dim(`(${value})`)} ${dim("→ using .git/hooks")}\n`;
}

export function hooksInstalledLine(): string {
  return `${tag()} ${pc.green("Hooks installed")} ${dim("→ .git/hooks")}\n`;
}

export function initCreatedLine(): string {
  return `${tag()} ${pc.green("Created")} ${bold("commitlens.config.ts")} ${dim("from template")}\n`;
}

export function doctorHeader(): string {
  return `\n${tag()} ${bold("Provider diagnostics")}\n`;
}

export function aiPingIntro(): string {
  return `${tag()} ${bold("ai-ping")} ${dim("— one minimal request to your AI provider (~30–120s)")}\n`;
}

export function aiPingSuccess(message: string): string {
  return `${tag()} ${pc.green("ai-ping ok")} ${dim("→")} ${message}\n`;
}

export function aiPingFail(message: string): string {
  return `${tag()} ${pc.red("ai-ping failed")} ${dim("→")} ${pc.yellow(message)}\n`;
}

export function aiPingHint(): string {
  return `${tag()} ${dim("Check")} ${pc.cyan("`claude`")} ${dim("on PATH, Claude login or ANTHROPIC_API_KEY,")} ${dim("COMMITLENS_AI_TIMEOUT_MS")}\n`;
}

/** Multi-line AI stdout shown after a passing ai step when configured. */
export function aiStreamBannerStart(): string {
  return `\n${tag()} ${dim("Claude")} ${bold("streaming")} ${dim("(stream-json · partial chunks)")}\n`;
}

export function aiStreamBannerEnd(): string {
  return `\n${tag()} ${dim("end stream")}\n`;
}

export function aiReviewOutputBlock(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") {
    return "";
  }

  const lines = trimmed.split(/\r?\n/);
  const block = lines.map((line) => `      ${dim("│")} ${line}`).join("\n");
  return `\n${tag()} ${dim("AI reply")}\n${block}\n`;
}
