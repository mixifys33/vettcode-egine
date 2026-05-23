import type { CodeFile } from "./types";
import { extractHighRiskCodeFromFiles, buildSmartContext, type ExtractedCode } from "./ast-extractor";

const MAX_CHARS_PER_BATCH = 32_000; // Reduced since we're sending only risky code
const MAX_SECTIONS_PER_BATCH = 20;

export interface SmartBatch {
  files: CodeFile[];
  extractedCode: ExtractedCode[];
  smartContext: string;
  stats: {
    totalLines: number;
    extractedLines: number;
    compressionRatio: number;
  };
}

export function createSmartBatches(files: CodeFile[]): SmartBatch[] {
  const batches: SmartBatch[] = [];
  
  // Extract high-risk code sections from all files
  const extracted = extractHighRiskCodeFromFiles(
    files.map((f) => ({ path: f.path, content: f.content }))
  );

  // Sort by total risk score (sum of all section risk scores)
  const sortedExtracted = extracted.sort((a, b) => {
    const scoreA = a.sections.reduce((sum, s) => sum + s.riskScore, 0);
    const scoreB = b.sections.reduce((sum, s) => sum + s.riskScore, 0);
    return scoreB - scoreA;
  });

  let currentBatch: ExtractedCode[] = [];
  let currentChars = 0;
  let currentSections = 0;

  for (const ext of sortedExtracted) {
    const context = buildSmartContext([ext]);
    const size = context.length;
    const sections = ext.sections.length;

    if (
      (currentChars + size > MAX_CHARS_PER_BATCH && currentBatch.length > 0) ||
      (currentSections + sections > MAX_SECTIONS_PER_BATCH && currentBatch.length > 0)
    ) {
      // Finalize current batch
      const batchFiles = currentBatch.map((e) => {
        const original = files.find((f) => f.path === e.file);
        return original || { path: e.file, content: "", lines: 0 };
      });

      const totalLines = currentBatch.reduce((sum, e) => sum + e.totalLines, 0);
      const extractedLines = currentBatch.reduce((sum, e) => sum + e.extractedLines, 0);

      batches.push({
        files: batchFiles,
        extractedCode: currentBatch,
        smartContext: buildSmartContext(currentBatch),
        stats: {
          totalLines,
          extractedLines,
          compressionRatio: totalLines > 0 ? extractedLines / totalLines : 0,
        },
      });

      currentBatch = [];
      currentChars = 0;
      currentSections = 0;
    }

    currentBatch.push(ext);
    currentChars += size;
    currentSections += sections;
  }

  // Add remaining batch
  if (currentBatch.length > 0) {
    const batchFiles = currentBatch.map((e) => {
      const original = files.find((f) => f.path === e.file);
      return original || { path: e.file, content: "", lines: 0 };
    });

    const totalLines = currentBatch.reduce((sum, e) => sum + e.totalLines, 0);
    const extractedLines = currentBatch.reduce((sum, e) => sum + e.extractedLines, 0);

    batches.push({
      files: batchFiles,
      extractedCode: currentBatch,
      smartContext: buildSmartContext(currentBatch),
      stats: {
        totalLines,
        extractedLines,
        compressionRatio: totalLines > 0 ? extractedLines / totalLines : 0,
      },
    });
  }

  return batches;
}

// Legacy function for backward compatibility
export function createBatches(files: CodeFile[]): CodeFile[][] {
  const smartBatches = createSmartBatches(files);
  return smartBatches.map((b) => b.files);
}
