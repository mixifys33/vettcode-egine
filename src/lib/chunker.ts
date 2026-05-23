import type { CodeFile } from "./types";

const MAX_FILES_PER_BATCH = 12;
const MAX_CHARS_PER_BATCH = 48_000;
const MAX_FILE_CHARS = 12_000;

export function trimFileContent(content: string): string {
  if (content.length <= MAX_FILE_CHARS) return content;
  const half = Math.floor(MAX_FILE_CHARS / 2);
  return (
    content.slice(0, half) +
    "\n\n/* ... Vettcode truncated middle of large file ... */\n\n" +
    content.slice(-half)
  );
}

export function createBatches(files: CodeFile[]): CodeFile[][] {
  const batches: CodeFile[][] = [];
  let current: CodeFile[] = [];
  let currentChars = 0;

  const sorted = [...files].sort((a, b) => {
    const priority = (p: string) => {
      if (p.includes("src/") || p.includes("app/") || p.includes("api/")) return 0;
      if (p.includes("lib/") || p.includes("server/")) return 1;
      if (p.endsWith(".env") || p.includes("config")) return 2;
      return 3;
    };
    return priority(a.path) - priority(b.path) || a.path.localeCompare(b.path);
  });

  for (const file of sorted) {
    const trimmed = trimFileContent(file.content);
    const entry: CodeFile = { ...file, content: trimmed };
    const size = trimmed.length + file.path.length;

    if (
      current.length >= MAX_FILES_PER_BATCH ||
      (currentChars + size > MAX_CHARS_PER_BATCH && current.length > 0)
    ) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(entry);
    currentChars += size;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}
