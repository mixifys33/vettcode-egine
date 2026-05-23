import { createSmartBatches } from "./chunker";
import type { BatchAnalysisResult, CodeFile, VettReport } from "./types";
import { runStaticAnalysis, type StaticFinding } from "./static-analyzer";
import { verifyFindings, filterHighConfidenceFindings, shouldSendToAI } from "./finding-verifier";

const PARALLEL = 3;

async function analyzeBatch(
  projectName: string,
  batchIndex: number,
  totalBatches: number,
  smartContext: string,
  staticFindings: StaticFinding[],
  keySlot: number
): Promise<BatchAnalysisResult> {
  const res = await fetch("/api/scan/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName,
      batchIndex,
      totalBatches,
      smartContext,
      staticFindings,
      keySlot,
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
  onProgress("Running static analysis", 5, "Pattern-based vulnerability detection");

  // Step 1: Static analysis (fast, catches 80% of issues)
  const staticFindings = runStaticAnalysis(
    files.map((f) => ({ path: f.path, content: f.content }))
  );

  onProgress(
    "Static analysis complete",
    15,
    `Found ${staticFindings.length} potential issues`
  );

  // Step 2: Verify findings
  const fileContents = new Map(files.map((f) => [f.path, f.content]));
  const verifiedFindings = verifyFindings(staticFindings, fileContents);
  const highConfidenceFindings = filterHighConfidenceFindings(verifiedFindings);

  onProgress(
    "Verification complete",
    20,
    `${highConfidenceFindings.length} high-confidence issues confirmed`
  );

  // Step 3: Smart code extraction (only risky sections)
  const smartBatches = createSmartBatches(files);
  const totalBatches = smartBatches.length;

  const totalLines = files.reduce((s, f) => s + f.lines, 0);
  const extractedLines = smartBatches.reduce((s, b) => s + b.stats.extractedLines, 0);
  const compressionRatio = ((extractedLines / totalLines) * 100).toFixed(1);

  onProgress(
    "Smart extraction complete",
    25,
    `Extracted ${extractedLines}/${totalLines} lines (${compressionRatio}% - ${totalBatches} AI batches)`
  );

  // Step 4: AI analysis (only on extracted risky code + low-confidence findings)
  const batchResults: BatchAnalysisResult[] = [];
  const findingsToVerify = verifiedFindings.filter(shouldSendToAI);

  for (let i = 0; i < smartBatches.length; i += PARALLEL) {
    const slice = smartBatches.slice(i, i + PARALLEL);
    const promises = slice.map((batch, j) => {
      const idx = i + j;
      // Only send findings relevant to this batch's files
      const batchFiles = new Set(batch.files.map((f) => f.path));
      const relevantFindings = findingsToVerify.filter((f) => batchFiles.has(f.file));

      return analyzeBatch(
        projectName,
        idx,
        totalBatches,
        batch.smartContext,
        relevantFindings,
        idx
      );
    });

    onProgress(
      "AI deep analysis in progress",
      25 + Math.round(((i + slice.length) / totalBatches) * 60),
      `Batches ${i + 1}–${Math.min(i + PARALLEL, totalBatches)} of ${totalBatches} (3 API keys rotating)`
    );

    const results = await Promise.all(promises);
    batchResults.push(...results);
  }

  onProgress("Synthesizing final report", 90);

  // Step 5: Merge static + AI findings
  const res = await fetch("/api/scan/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName,
      stats: { 
        files: files.length, 
        lines: totalLines, 
        ignored: ignoredCount,
        extractedLines,
        compressionRatio: parseFloat(compressionRatio),
      },
      staticFindings: highConfidenceFindings,
      batchResults,
    }),
  });

  const report = await res.json();
  if (!res.ok) throw new Error(report.error ?? "Report synthesis failed");

  onProgress("Complete", 100);
  return report as VettReport;
}
