import { createBatches } from "./chunker";
import type { BatchAnalysisResult, CodeFile, VettReport } from "./types";

const PARALLEL = 3;

async function analyzeBatch(
  projectName: string,
  batchIndex: number,
  totalBatches: number,
  files: CodeFile[]
): Promise<BatchAnalysisResult> {
  const res = await fetch("/api/scan/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName,
      batchIndex,
      totalBatches,
      files,
      keySlot: batchIndex,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Batch analysis failed");
  return data as BatchAnalysisResult;
}

export async function runFullScan(
  projectName: string,
  files: CodeFile[],
  ignoredCount: number,
  onProgress: (phase: string, pct: number, detail?: string) => void
): Promise<VettReport> {
  const batches = createBatches(files);
  const totalBatches = batches.length;
  const batchResults: BatchAnalysisResult[] = [];

  onProgress("Preparing codebase batches", 5, `${files.length} files → ${totalBatches} AI batches`);

  for (let i = 0; i < batches.length; i += PARALLEL) {
    const slice = batches.slice(i, i + PARALLEL);
    const promises = slice.map((batch, j) => {
      const idx = i + j;
      return analyzeBatch(projectName, idx, totalBatches, batch);
    });

    onProgress(
      "AI vetting in progress",
      10 + Math.round(((i + slice.length) / totalBatches) * 70),
      `Batches ${i + 1}–${Math.min(i + PARALLEL, totalBatches)} of ${totalBatches} (3 API keys in rotation)`
    );

    const results = await Promise.all(promises);
    batchResults.push(...results);
  }

  onProgress("Synthesizing final strict report", 88);

  const lines = files.reduce((s, f) => s + f.lines, 0);

  const res = await fetch("/api/scan/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName,
      stats: { files: files.length, lines, ignored: ignoredCount },
      batchResults,
    }),
  });

  const report = await res.json();
  if (!res.ok) throw new Error(report.error ?? "Report synthesis failed");

  onProgress("Complete", 100);
  return report as VettReport;
}
