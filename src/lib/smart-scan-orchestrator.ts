/**
 * Smart Scan Orchestrator
 * Implements the full pipeline:
 * 1. Static Analysis → 2. AST Extraction → 3. AI Analysis → 4. Verification → 5. Report
 */

import { runStaticAnalysis, shouldSendToAI, type StaticFinding } from "./static-analyzer";
import { extractHighRiskCode, shouldAnalyzeFile, type ExtractedCode } from "./ast-extractor";
import { verifyFindings, deduplicateFindings, calculateReportConfidence, type AIFinding, type VerifiedFinding } from "./verification-layer";
import type { CodeFile, VettReport } from "./types";

export interface ScanProgress {
  phase: string;
  percentage: number;
  detail?: string;
}

export interface SmartScanResult {
  report: VettReport;
  stats: {
    filesScanned: number;
    linesScanned: number;
    staticFindings: number;
    aiFindings: number;
    verifiedFindings: number;
    falsePositives: number;
    tokensSaved: string;
  };
}

const PARALLEL_AI_CALLS = 3;

export async function runSmartScan(
  projectName: string,
  files: CodeFile[],
  ignoredCount: number,
  onProgress: (phase: string, pct: number, detail?: string) => void
): Promise<SmartScanResult> {
  
  // Phase 1: Static Analysis (fast, catches 70-80% of issues)
  onProgress("Static Analysis", 10, "Running pattern-based security checks...");
  
  const staticFindings = runStaticAnalysis(files);
  
  onProgress("Static Analysis Complete", 25, `Found ${staticFindings.length} potential issues`);

  // Phase 2: AST Extraction (extract only high-risk code sections)
  onProgress("Code Analysis", 30, "Extracting high-risk code sections...");
  
  const extractedSections: ExtractedCode[] = [];
  let totalOriginalChars = 0;
  let totalExtractedChars = 0;

  for (const file of files) {
    if (!shouldAnalyzeFile(file.path)) continue;
    
    totalOriginalChars += file.content.length;
    
    const extracted = extractHighRiskCode(file.path, file.content);
    if (extracted && extracted.sections.length > 0) {
      extractedSections.push(extracted);
      totalExtractedChars += extracted.sections.reduce((sum, s) => sum + s.code.length, 0);
    }
  }

  const tokenReduction = totalOriginalChars > 0 
    ? Math.round((1 - totalExtractedChars / totalOriginalChars) * 100)
    : 0;

  onProgress(
    "Code Extraction Complete", 
    40, 
    `Extracted ${extractedSections.length} high-risk sections (${tokenReduction}% token reduction)`
  );

  // Phase 3: AI Analysis (only on extracted high-risk sections + low-confidence static findings)
  onProgress("AI Deep Analysis", 45, "Sending high-risk code to AI for deep reasoning...");

  const aiFindings = await runAIAnalysis(
    projectName,
    extractedSections,
    staticFindings.filter(shouldSendToAI),
    onProgress
  );

  onProgress("AI Analysis Complete", 75, `AI found ${aiFindings.length} additional issues`);

  // Phase 4: Verification Layer (cross-validate AI findings)
  onProgress("Verification", 80, "Validating findings and removing false positives...");

  const verificationResult = verifyFindings(aiFindings, staticFindings, files);
  
  onProgress("Verification Complete", 85, 
    `${verificationResult.summary.confirmed} confirmed, ${verificationResult.summary.falsePositives} false positives removed`
  );

  // Phase 5: Merge and deduplicate all findings
  onProgress("Generating Report", 90, "Merging static analysis and AI findings...");

  // Convert static findings to verified findings
  const verifiedStaticFindings: VerifiedFinding[] = staticFindings.map(sf => ({
    id: sf.id,
    severity: sf.severity,
    category: sf.category,
    title: sf.title,
    description: sf.description,
    file: sf.file,
    line: sf.line,
    evidence: sf.evidence,
    mitigation: generateMitigation(sf),
    prevention: generatePrevention(sf),
    confidence: sf.confidence,
    verificationStatus: "confirmed" as const,
    verificationNotes: "Detected by static analysis",
    sources: ["static-analysis" as const],
  }));

  // Merge all findings
  const allFindings = [...verifiedStaticFindings, ...verificationResult.verified];
  const deduplicated = deduplicateFindings(allFindings);

  // Calculate strict score
  const score = calculateStrictScore(deduplicated);
  const grade = scoreToGrade(score);

  // Generate executive verdict
  const executiveVerdict = generateExecutiveVerdict(deduplicated, score);

  // Identify critical blockers
  const criticalBlockers = deduplicated
    .filter(f => f.severity === "critical" || (f.severity === "high" && f.confidence === "high"))
    .map(f => `${f.title} in ${f.file}:${f.line}`);

  // Identify strengths
  const strengths = identifyStrengths(files, deduplicated);

  // Calculate report confidence
  const reportConfidence = calculateReportConfidence(deduplicated);

  onProgress("Complete", 100, "Scan complete");

  const report: VettReport = {
    score,
    grade,
    summary: `Analyzed ${files.length} files (${files.reduce((s, f) => s + f.lines, 0)} lines). Found ${deduplicated.length} verified issues.`,
    executiveVerdict,
    findings: deduplicated.map(f => ({
      id: f.id,
      severity: f.severity,
      category: f.category,
      title: f.title,
      description: f.description,
      file: f.file,
      line: f.line,
      evidence: f.evidence,
      mitigation: f.mitigation,
      prevention: f.prevention,
    })),
    strengths,
    criticalBlockers,
    metadata: {
      projectName,
      scannedAt: new Date().toISOString(),
      filesScanned: files.length,
      linesScanned: files.reduce((s, f) => s + f.lines, 0),
      ignoredPaths: ignoredCount,
      reportConfidence: reportConfidence.score,
      reportConfidenceGrade: reportConfidence.grade,
      reportConfidenceExplanation: reportConfidence.explanation,
    },
  };

  const stats = {
    filesScanned: files.length,
    linesScanned: files.reduce((s, f) => s + f.lines, 0),
    staticFindings: staticFindings.length,
    aiFindings: aiFindings.length,
    verifiedFindings: deduplicated.length,
    falsePositives: verificationResult.summary.falsePositives,
    tokensSaved: `${tokenReduction}% (${Math.round((totalOriginalChars - totalExtractedChars) / 1000)}K chars)`,
  };

  return { report, stats };
}

async function runAIAnalysis(
  projectName: string,
  extractedSections: ExtractedCode[],
  lowConfidenceStaticFindings: StaticFinding[],
  onProgress: (phase: string, pct: number, detail?: string) => void
): Promise<AIFinding[]> {
  
  if (extractedSections.length === 0 && lowConfidenceStaticFindings.length === 0) {
    return [];
  }

  // Create batches for AI analysis
  const batches = createSmartBatches(extractedSections, lowConfidenceStaticFindings);
  const aiFindings: AIFinding[] = [];

  for (let i = 0; i < batches.length; i += PARALLEL_AI_CALLS) {
    const slice = batches.slice(i, i + PARALLEL_AI_CALLS);
    
    const progressPct = 45 + Math.round(((i + slice.length) / batches.length) * 30);
    onProgress(
      "AI Deep Analysis",
      progressPct,
      `Analyzing batch ${i + 1}-${Math.min(i + PARALLEL_AI_CALLS, batches.length)} of ${batches.length}`
    );

    const promises = slice.map((batch, j) => 
      analyzeBatchWithAI(projectName, i + j, batches.length, batch)
    );

    const results = await Promise.all(promises);
    aiFindings.push(...results.flat());
  }

  return aiFindings;
}

interface SmartBatch {
  sections: ExtractedCode[];
  staticFindings: StaticFinding[];
}

function createSmartBatches(
  extractedSections: ExtractedCode[],
  staticFindings: StaticFinding[]
): SmartBatch[] {
  const MAX_CHARS_PER_BATCH = 40_000; // Reduced from 48K
  const batches: SmartBatch[] = [];
  
  let currentBatch: SmartBatch = { sections: [], staticFindings: [] };
  let currentChars = 0;

  // Add extracted sections
  for (const section of extractedSections) {
    const sectionChars = section.sections.reduce((sum, s) => sum + s.code.length, 0);
    
    if (currentChars + sectionChars > MAX_CHARS_PER_BATCH && currentBatch.sections.length > 0) {
      batches.push(currentBatch);
      currentBatch = { sections: [], staticFindings: [] };
      currentChars = 0;
    }

    currentBatch.sections.push(section);
    currentChars += sectionChars;
  }

  // Add static findings that need AI verification
  const findingsText = staticFindings.map(f => 
    `${f.file}:${f.line} - ${f.title}: ${f.evidence}`
  ).join("\n");

  if (findingsText.length < MAX_CHARS_PER_BATCH - currentChars) {
    currentBatch.staticFindings = staticFindings;
  } else if (currentBatch.sections.length > 0) {
    batches.push(currentBatch);
    currentBatch = { sections: [], staticFindings };
  }

  if (currentBatch.sections.length > 0 || currentBatch.staticFindings.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function analyzeBatchWithAI(
  projectName: string,
  batchIndex: number,
  totalBatches: number,
  batch: SmartBatch
): Promise<AIFinding[]> {
  
  const res = await fetch("/api/scan/smart-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName,
      batchIndex,
      totalBatches,
      batch,
      keySlot: batchIndex,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error ?? "AI analysis failed");
  }

  const data = await res.json();
  return data.findings || [];
}

function calculateStrictScore(findings: VerifiedFinding[]): number {
  if (findings.length === 0) return 95; // Not perfect, might have missed issues

  let deductions = 0;

  for (const finding of findings) {
    let weight = 1;

    // Severity weight
    switch (finding.severity) {
      case "critical": weight = 15; break;
      case "high": weight = 8; break;
      case "medium": weight = 4; break;
      case "low": weight = 2; break;
      case "info": weight = 0.5; break;
    }

    // Confidence multiplier
    switch (finding.confidence) {
      case "high": weight *= 1.0; break;
      case "medium": weight *= 0.7; break;
      case "low": weight *= 0.4; break;
    }

    deductions += weight;
  }

  // Strict scoring: start at 100, deduct heavily
  const score = Math.max(0, Math.round(100 - deductions));
  return score;
}

function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  if (score >= 45) return "D";
  if (score >= 40) return "D-";
  return "F";
}

function generateExecutiveVerdict(findings: VerifiedFinding[], score: number): string {
  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;

  if (critical > 0) {
    return `CRITICAL: ${critical} critical security vulnerabilities detected. This codebase is NOT production-ready and poses immediate security risks. ${high > 0 ? `Additionally, ${high} high-severity issues require urgent attention.` : ""} Immediate remediation required before any deployment.`;
  }

  if (high > 5) {
    return `HIGH RISK: ${high} high-severity issues detected. While no critical vulnerabilities exist, this codebase has significant production risks including security flaws, error handling gaps, and potential data integrity issues. Recommend thorough review and fixes before production deployment.`;
  }

  if (score >= 80) {
    return `GOOD: This codebase demonstrates solid engineering practices with ${findings.length} minor issues identified. The code is production-ready with recommended improvements for enhanced security and maintainability. Continue monitoring and addressing findings during regular maintenance cycles.`;
  }

  if (score >= 60) {
    return `MODERATE: This codebase has ${findings.length} issues spanning security, code quality, and reliability concerns. While functional, it requires attention to several areas before being considered production-hardened. Prioritize high and medium severity findings.`;
  }

  return `NEEDS IMPROVEMENT: This codebase has ${findings.length} issues across multiple categories. Significant refactoring and security hardening required. Recommend addressing all high and medium severity findings before production use.`;
}

function identifyStrengths(files: CodeFile[], findings: VerifiedFinding[]): string[] {
  const strengths: string[] = [];

  // Check for TypeScript usage
  const tsFiles = files.filter(f => /\.tsx?$/.test(f.path));
  if (tsFiles.length / files.length > 0.7) {
    strengths.push("Strong type safety with TypeScript");
  }

  // Check for error handling
  const errorHandlingCount = files.filter(f => 
    /try\s*\{|\.catch\(|\.finally\(/i.test(f.content)
  ).length;
  if (errorHandlingCount / files.length > 0.5) {
    strengths.push("Consistent error handling patterns");
  }

  // Check for environment variable usage
  const envUsage = files.filter(f => 
    /process\.env|import\.meta\.env/i.test(f.content)
  ).length;
  if (envUsage > 0 && findings.filter(f => f.title.includes("hardcoded")).length === 0) {
    strengths.push("Proper use of environment variables for configuration");
  }

  // Check for testing
  const testFiles = files.filter(f => /\.(test|spec)\.[jt]sx?$/.test(f.path));
  if (testFiles.length > files.length * 0.2) {
    strengths.push("Good test coverage with dedicated test files");
  }

  // Check for modern async/await
  const asyncUsage = files.filter(f => /async\s+(?:function|\()/i.test(f.content)).length;
  if (asyncUsage > 0) {
    strengths.push("Modern async/await patterns for asynchronous operations");
  }

  if (strengths.length === 0) {
    strengths.push("Codebase is functional and serves its purpose");
  }

  return strengths;
}

function generateMitigation(finding: StaticFinding): string {
  // Generate specific mitigation based on finding type
  const mitigations: Record<string, string> = {
    "sql-injection": "Use parameterized queries or an ORM like Prisma/TypeORM",
    "xss": "Sanitize user input with DOMPurify before rendering",
    "hardcoded-secret": "Move to environment variables and use a secrets manager",
    "command-injection": "Avoid shell execution or use parameterized commands",
    "missing-auth": "Add authentication middleware to protect this endpoint",
    "unhandled-promise": "Wrap in try-catch or add .catch() handler",
    "n-plus-one": "Use eager loading or batch queries",
    "console-log": "Replace with proper logging library (winston, pino)",
    "empty-catch": "Log the error or handle it appropriately",
  };

  for (const [key, mitigation] of Object.entries(mitigations)) {
    if (finding.id.includes(key)) {
      return mitigation;
    }
  }

  return "Review and fix according to best practices";
}

function generatePrevention(finding: StaticFinding): string {
  const preventions: Record<string, string> = {
    "sql-injection": "Always use ORMs or parameterized queries; never concatenate user input into SQL",
    "xss": "Implement Content Security Policy and sanitize all user-generated content",
    "hardcoded-secret": "Use environment variables and secret management tools; add pre-commit hooks to detect secrets",
    "command-injection": "Avoid shell execution; if necessary, use allowlists and strict input validation",
    "missing-auth": "Implement authentication middleware at the router level",
    "unhandled-promise": "Enable ESLint rules for floating promises",
    "n-plus-one": "Use database query profiling and monitoring",
    "console-log": "Configure linting rules to prevent console statements in production code",
  };

  for (const [key, prevention] of Object.entries(preventions)) {
    if (finding.id.includes(key)) {
      return prevention;
    }
  }

  return "Follow security and code quality best practices";
}
