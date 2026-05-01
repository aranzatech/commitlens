/**
 * Whether provider stdout should count as "review passed" for hooks.
 * Models rarely print only the exact bytes `OK`.
 */
export function inferPassFromReviewOutput(output: string): boolean {
  const trimmed = output.trim();
  if (trimmed === "") {
    return false;
  }

  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
  if (/^OK\.?!?$/i.test(firstLine)) {
    return true;
  }

  if (trimmed.length <= 40 && /^(OK|LGTM)\.?$/i.test(trimmed)) {
    return true;
  }

  return false;
}
