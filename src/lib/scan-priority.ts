import type { CodeFile } from "./types";
import { shouldAnalyzeFile } from "./ast-extractor";

/** Higher score = analyzed first in quick mode. */
export function filePriorityScore(filepath: string): number {
  const p = filepath.replace(/\\/g, "/").toLowerCase();
  let score = 0;

  if (/\/(api|routes|controllers|middleware|auth|security)\//.test(p)) score += 100;
  if (/\/(app|src|server|backend|lib)\//.test(p)) score += 40;
  if (/(route|controller|middleware|auth|login|signup|session|jwt|oauth)/i.test(p)) score += 60;
  if (/(handler|resolver|service|repository|model|schema)/i.test(p)) score += 30;
  if (/(config|env|settings|database|db|prisma|drizzle|sequelize)/i.test(p)) score += 50;
  if (/(index|main|app|server|entry)\.[jt]sx?$/.test(p)) score += 45;
  if (p.includes("package.json") || p.endsWith(".env.example")) score += 35;
  if (/\/(pages|views|components)\//.test(p)) score += 15;
  if (p.includes("node_modules") || p.includes("dist/") || p.includes(".test.")) score -= 200;

  return score;
}

const QUICK_MAX_FILES = 42;

export function selectFilesForQuickScan(files: CodeFile[]): CodeFile[] {
  const candidates = files.filter((f) => shouldAnalyzeFile(f.path));
  if (candidates.length <= QUICK_MAX_FILES) return candidates;

  return [...candidates]
    .sort((a, b) => filePriorityScore(b.path) - filePriorityScore(a.path))
    .slice(0, QUICK_MAX_FILES);
}

export function estimateScanMinutes(
  mode: "quick" | "deep",
  aiBatchCount: number
): { min: number; max: number } {
  const perBatch = mode === "quick" ? 0.35 : 0.55;
  const parallel = 3;
  const rounds = Math.ceil(aiBatchCount / parallel);
  const minutes = (rounds * perBatch) + (mode === "quick" ? 0.25 : 0.5);
  return {
    min: Math.max(1, Math.floor(minutes * 0.7)),
    max: Math.ceil(minutes * 1.4) + 1,
  };
}
