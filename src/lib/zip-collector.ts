import JSZip from "jszip";
import { shouldIgnorePath } from "./ignore-patterns";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from "./collect-limits";
import type { CodeFile } from "./types";

function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function isLikelyBinary(buffer: ArrayBuffer | SharedArrayBuffer): boolean {
  const view = new Uint8Array(buffer.slice(0, 512));
  for (const b of view) {
    if (b === 0) return true;
  }
  return false;
}

function stripArchiveRoot(paths: string[]): (path: string) => string {
  if (paths.length === 0) return (p) => p;
  const first = paths[0].replace(/\\/g, "/");
  const slash = first.indexOf("/");
  const prefix = slash === -1 ? `${first}/` : `${first.slice(0, slash + 1)}`;
  return (path: string) => {
    const normalized = path.replace(/\\/g, "/");
    return normalized.startsWith(prefix)
      ? normalized.slice(prefix.length)
      : normalized;
  };
}

export interface ZipCollectResult {
  files: CodeFile[];
  ignoredCount: number;
  totalBytes: number;
  warnings: string[];
}

export async function collectFromZipBuffer(
  buffer: ArrayBuffer
): Promise<ZipCollectResult> {
  const zip = await JSZip.loadAsync(buffer);
  const warnings: string[] = [];
  const files: CodeFile[] = [];
  let ignoredCount = 0;
  let totalBytes = 0;

  const entryNames = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const normalizePath = stripArchiveRoot(entryNames);

  for (const rawPath of entryNames) {
    const path = normalizePath(rawPath);
    if (!path || shouldIgnorePath(path)) {
      ignoredCount++;
      continue;
    }

    const entry = zip.files[rawPath];
    const uint8 = await entry.async("uint8array");

    if (uint8.byteLength > MAX_FILE_BYTES) {
      ignoredCount++;
      continue;
    }

    if (files.length >= MAX_FILES) {
      warnings.push(`Stopped at ${MAX_FILES} files.`);
      break;
    }

    if (totalBytes + uint8.byteLength > MAX_TOTAL_BYTES) {
      warnings.push("Total size limit reached.");
      break;
    }

    if (isLikelyBinary(uint8.buffer)) {
      ignoredCount++;
      continue;
    }

    const content = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
    files.push({ path, content, lines: countLines(content) });
    totalBytes += uint8.byteLength;
  }

  if (files.length === 0) {
    warnings.push("No scannable source files in archive.");
  }

  return { files, ignoredCount, totalBytes, warnings };
}
