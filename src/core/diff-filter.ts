/** Layer 2 — paths that are never useful to review regardless of filePatterns. */
const IGNORED_PATH_PATTERNS: RegExp[] = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  /\.lock$/,
  /\.min\.(js|css)$/,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^out\//,
  /^coverage\//,
  /^node_modules\//,
  /^\.cache\//,
  /\.map$/,
  /\.snap$/
];

export function shouldIgnorePath(filePath: string): boolean {
  return IGNORED_PATH_PATTERNS.some((re) => re.test(filePath));
}

export function filterIgnoredFiles(files: string[]): string[] {
  return files.filter((f) => !shouldIgnorePath(f));
}

export interface TruncateResult {
  diff: string;
  truncated: boolean;
  totalLines: number;
}

/**
 * Layer 3 + 4 — truncate a unified diff by per-file line limit and global line limit.
 * Adds a trailing note when truncation occurs so the model knows context is partial.
 */
export function truncateDiff(
  rawDiff: string,
  maxLinesPerFile: number,
  maxTotalLines: number
): TruncateResult {
  if (rawDiff.trim() === "") {
    return { diff: "", truncated: false, totalLines: 0 };
  }

  // Split by file chunks (each starts with "diff --git")
  const chunks = rawDiff.split(/(?=^diff --git )/m).filter((c) => c.trim() !== "");
  const resultChunks: string[] = [];
  let totalLines = 0;
  let truncated = false;

  for (const chunk of chunks) {
    const lines = chunk.split("\n");

    // Per-file limit (layer 3)
    const fileLines = lines.length <= maxLinesPerFile ? lines : lines.slice(0, maxLinesPerFile);
    if (lines.length > maxLinesPerFile) {
      truncated = true;
    }

    // Global limit (layer 4)
    const remaining = maxTotalLines - totalLines;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    if (fileLines.length > remaining) {
      resultChunks.push(fileLines.slice(0, remaining).join("\n"));
      totalLines += remaining;
      truncated = true;
      break;
    }

    resultChunks.push(fileLines.join("\n"));
    totalLines += fileLines.length;
  }

  const diff = resultChunks.join("\n");
  return { diff, truncated, totalLines };
}

export const DEFAULT_MAX_LINES_PER_FILE = 150;
export const DEFAULT_MAX_TOTAL_LINES = 400;
