/**
 * Matches staged paths against commitlens filePatterns (e.g. suffix globs like star.ts).
 */
export function matchesFilePattern(relativePath: string, pattern: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const p = pattern.replace(/\\/g, "/");

  if (p.startsWith("*.")) {
    const suffix = p.slice(1);
    return normalizedPath.endsWith(suffix);
  }

  const reStr =
    "^" +
    p
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*\//g, "(?:.*/)?")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]") +
    "$";

  return new RegExp(reStr).test(normalizedPath);
}

export function filterPathsByPatterns(paths: string[], patterns: string[] | undefined): string[] {
  if (patterns === undefined || patterns.length === 0) {
    return paths;
  }

  return paths.filter((path) => patterns.some((pat) => matchesFilePattern(path, pat)));
}
