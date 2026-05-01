import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

interface CachedReview {
  message: string;
  passed: boolean;
}

function getCacheDir(cwd: string): string {
  const cwdHash = createHash("sha1").update(cwd).digest("hex").slice(0, 10);
  return path.join(os.tmpdir(), "commitlens-cache", cwdHash);
}

/** Cache key is a hash of step name + prompt + raw diff — invalidated by any content change. */
export function buildCacheKey(stepName: string, prompt: string, diff: string): string {
  return createHash("sha256")
    .update(`${stepName}:${prompt}:${diff}`)
    .digest("hex");
}

export async function readReviewCache(key: string, cwd: string): Promise<CachedReview | null> {
  const file = path.join(getCacheDir(cwd), `${key}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as CachedReview;
  } catch {
    return null;
  }
}

export async function writeReviewCache(
  key: string,
  result: CachedReview,
  cwd: string
): Promise<void> {
  const dir = getCacheDir(cwd);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${key}.json`), JSON.stringify(result), "utf8");
  } catch {
    // Cache write failure is never fatal
  }
}
