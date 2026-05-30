import { shouldIgnorePath } from "./ignore-patterns";
import type { CodeFile } from "./types";

const MAX_FILES = 2000; // Increased from 400
const MAX_FILE_BYTES = 500_000; // Increased from 150KB
const MAX_TOTAL_BYTES = 20_000_000; // Increased to 20MB (we extract only risky code anyway)

function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function isLikelyBinary(buffer: ArrayBuffer | SharedArrayBuffer): boolean {
  const view = new Uint8Array(buffer.slice(0, 512));
  let nulls = 0;
  for (const b of view) {
    if (b === 0) nulls++;
  }
  return nulls > 0;
}

export interface CollectResult {
  files: CodeFile[];
  ignoredCount: number;
  totalBytes: number;
  warnings: string[];
}

export async function collectFromFileList(
  fileList: FileList,
  projectName: string
): Promise<CollectResult> {
  const warnings: string[] = [];
  const files: CodeFile[] = [];
  let ignoredCount = 0;
  let totalBytes = 0;

  const items = Array.from(fileList);
  console.log(`[collectFromFileList] Total files: ${items.length}`);

  for (const file of items) {
    // Use webkitRelativePath for folder uploads to preserve full directory structure
    const rawPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    const path = rawPath.replace(/\\/g, "/");

    console.log(`[collectFromFileList] File path: ${path}, webkitRelativePath: ${(file as File & { webkitRelativePath?: string }).webkitRelativePath}`);

    if (shouldIgnorePath(path)) {
      ignoredCount++;
      continue;
    }

    if (file.size > MAX_FILE_BYTES) {
      ignoredCount++;
      warnings.push(`Skipped large file: ${path} (${file.size} bytes)`);
      continue;
    }

    if (files.length >= MAX_FILES) {
      warnings.push(`Stopped at ${MAX_FILES} files — upload a smaller subset for full coverage.`);
      break;
    }

    if (totalBytes + file.size > MAX_TOTAL_BYTES) {
      warnings.push("Total size limit reached; remaining files skipped.");
      break;
    }

    const buffer = await file.arrayBuffer();
    if (isLikelyBinary(buffer)) {
      ignoredCount++;
      continue;
    }

    const content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    if (content.includes("\uFFFD") && buffer.byteLength > 1000) {
      ignoredCount++;
      continue;
    }

    files.push({
      path,
      content,
      lines: countLines(content),
    });
    totalBytes += file.size;
  }

  if (files.length === 0) {
    warnings.push(
      "No scannable source files found. Ensure you selected a project folder with source code (not only node_modules)."
    );
  }

  void projectName;
  return { files, ignoredCount, totalBytes, warnings };
}

export async function collectFromZip(
  zipFile: File,
  projectName: string
): Promise<CollectResult> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(zipFile);
  const warnings: string[] = [];
  const files: CodeFile[] = [];
  let ignoredCount = 0;
  let totalBytes = 0;

  const entries = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir
  );

  for (const path of entries) {
    const normalized = path.replace(/\\/g, "/");
    if (shouldIgnorePath(normalized)) {
      ignoredCount++;
      continue;
    }

    const entry = zip.files[path];
    const uint8 = await entry.async("uint8array");
    if (uint8.byteLength > MAX_FILE_BYTES) {
      ignoredCount++;
      continue;
    }

    if (files.length >= MAX_FILES || totalBytes + uint8.byteLength > MAX_TOTAL_BYTES) {
      warnings.push("ZIP partially scanned due to size limits.");
      break;
    }

    if (isLikelyBinary(uint8.buffer)) {
      ignoredCount++;
      continue;
    }

    const content = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
    files.push({
      path: normalized,
      content,
      lines: countLines(content),
    });
    totalBytes += uint8.byteLength;
  }

  void projectName;
  return { files, ignoredCount, totalBytes, warnings };
}
