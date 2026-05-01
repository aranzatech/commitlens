/**
 * Best-effort extraction of assistant-visible text from Claude Code `--output-format stream-json` lines.
 * Schema may vary between CLI versions; we only pull nested `.text` string fields.
 */
export function extractAssistantTextFragments(parsed: Record<string, unknown>): string[] {
  const out: string[] = [];

  const walk = (value: unknown): void => {
    if (value === null || value === undefined || typeof value === "string" || typeof value === "number") {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;

    if (typeof record.text === "string" && record.text.length > 0) {
      out.push(record.text);
    }

    for (const nested of Object.values(record)) {
      walk(nested);
    }
  };

  walk(parsed);
  return out;
}

/** Turns one NDJSON line into text to print live (may be empty). */
export function streamJsonLineToTerminalPreview(line: string): string {
  const trimmed = line.trim();
  if (trimmed === "") {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const parts = extractAssistantTextFragments(parsed);
    return parts.join("");
  } catch {
    return `${trimmed}\n`;
  }
}

/** Full NDJSON stdout → concatenated assistant-ish text for OK detection and summary. */
export function plainTextFromStreamJsonStdout(raw: string): string {
  const pieces: string[] = [];

  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      pieces.push(...extractAssistantTextFragments(parsed));
    } catch {
      pieces.push(trimmed);
    }
  }

  return pieces.join("");
}
