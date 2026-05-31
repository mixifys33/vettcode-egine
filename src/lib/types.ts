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
  source?: "static" | "ai" | "verified" | "scanner"; // Track where finding came from
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
    // AI analysis stats
    staticFindings?: number;
    aiFindings?: number;
    verifiedFindings?: number;
    scannerFindings?: number;
    // Score breakdown
    staticOnlyScore?: number;
    fullScore?: number;
    displayedScore?: number;
    scoreSource?: "static" | "ai" | "average";
    // Scanner results
    scannerResults?: {
      npmAudit?: { total: number; low: number; moderate: number; high: number; critical: number };
      snyk?: { total: number; low: number; medium: number; high: number; critical: number };
      sonarJS?: { total: number; bugs: number; vulnerabilities: number; codeSmells: number; securityHotspots: number; suggestions: number };
      clinic?: { total: number; memoryLeaks: number; eventLoopLag: number; cpuUsage: number; ioBlocking: number; asyncWaterfall: number };
      artillery?: { total: number; high: number; medium: number; low: number };
      autocannon?: { total: number; high: number; medium: number; low: number };
    };
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
