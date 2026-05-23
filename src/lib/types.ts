export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "security"
  | "production"
  | "typing"
  | "logic"
  | "database"
  | "performance"
  | "reliability"
  | "configuration"
  | "code-quality"
  | "react"
  | "other";

export interface Finding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  mitigation: string;
  prevention: string;
}

export interface BatchAnalysisResult {
  batchIndex: number;
  findings: Finding[];
  notes: string;
  partialScore?: number;
}

export interface VettReport {
  score: number;
  grade: string;
  summary: string;
  executiveVerdict: string;
  findings: Finding[];
  strengths: string[];
  criticalBlockers: string[];
  metadata?: {
    projectName: string;
    scannedAt: string;
    filesScanned: number;
    linesScanned: number;
    ignoredPaths: number;
    reportConfidence?: number;
    reportConfidenceGrade?: string;
    reportConfidenceExplanation?: string;
    fileTree?: FileTreeNode[];
  };
  // Legacy fields for backward compatibility
  scannedFiles?: number;
  scannedLines?: number;
  ignoredPaths?: number;
  modelUsed?: string;
}

export interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
}

export interface CodeFile {
  path: string;
  content: string;
  lines: number;
}

export interface ScanManifest {
  projectName: string;
  files: CodeFile[];
  ignoredCount: number;
  totalBytes: number;
}
