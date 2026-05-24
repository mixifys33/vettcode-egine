import type { CodeFile } from "./types";

export interface RemoteCollectResult {
  files: CodeFile[];
  ignoredCount: number;
  totalBytes: number;
  warnings: string[];
  projectName: string;
  ref: string;
  provider: string;
}
