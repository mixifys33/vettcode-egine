/**
 * Verification Layer
 * Validates AI findings to prevent hallucinations and false positives
 * Cross-references with static analysis and code context
 */

import type { StaticFinding } from "./static-analyzer";
import type { FindingCategory } from "./types";

export interface AIFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: FindingCategory;
  title: string;
  description: string;
  file: string;
  line: number;
  evidence: string;
  mitigation: string;
  prevention: string;
}

export interface VerifiedFinding extends AIFinding {
  confidence: "high" | "medium" | "low";
  verificationStatus: "confirmed" | "likely" | "uncertain" | "false-positive";
  verificationNotes: string;
  sources: ("static-analysis" | "ai-analysis" | "pattern-match")[];
}

export interface VerificationResult {
  verified: VerifiedFinding[];
  falsePositives: AIFinding[];
  summary: {
    totalFindings: number;
    confirmed: number;
    likely: number;
    uncertain: number;
    falsePositives: number;
  };
}

/**
 * Cross-verify AI findings with static analysis results
 */
export function verifyFindings(
  aiFindings: AIFinding[],
  staticFindings: StaticFinding[],
  codeFiles: Array<{ path: string; content: string }>
): VerificationResult {
  const verified: VerifiedFinding[] = [];
  const falsePositives: AIFinding[] = [];

  for (const aiFinding of aiFindings) {
    const verification = verifyIndividualFinding(aiFinding, staticFindings, codeFiles);
    
    if (verification.verificationStatus === "false-positive") {
      falsePositives.push(aiFinding);
    } else {
      verified.push(verification);
    }
  }

  // Sort by confidence and severity
  verified.sort((a, b) => {
    const confidenceScore = { high: 3, medium: 2, low: 1 };
    const severityScore = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    
    const aScore = confidenceScore[a.confidence] + severityScore[a.severity];
    const bScore = confidenceScore[b.confidence] + severityScore[b.severity];
    
    return bScore - aScore;
  });

  const summary = {
    totalFindings: aiFindings.length,
    confirmed: verified.filter(f => f.verificationStatus === "confirmed").length,
    likely: verified.filter(f => f.verificationStatus === "likely").length,
    uncertain: verified.filter(f => f.verificationStatus === "uncertain").length,
    falsePositives: falsePositives.length,
  };

  return { verified, falsePositives, summary };
}

function verifyIndividualFinding(
  aiFinding: AIFinding,
  staticFindings: StaticFinding[],
  codeFiles: Array<{ path: string; content: string }>
): VerifiedFinding {
  const sources: ("static-analysis" | "ai-analysis" | "pattern-match")[] = ["ai-analysis"];
  let confidence: "high" | "medium" | "low" = "medium";
  let verificationStatus: "confirmed" | "likely" | "uncertain" | "false-positive" = "likely";
  let verificationNotes = "";

  // 1. Check if static analysis also found this issue
  const matchingStatic = staticFindings.find(
    sf => 
      sf.file === aiFinding.file &&
      Math.abs(sf.line - aiFinding.line) <= 3 && // Within 3 lines
      sf.category === aiFinding.category
  );

  if (matchingStatic) {
    sources.push("static-analysis");
    confidence = "high";
    verificationStatus = "confirmed";
    verificationNotes = "Confirmed by static analysis";
  }

  // 2. Verify the evidence actually exists in the code
  const file = codeFiles.find(f => f.path === aiFinding.file);
  if (file) {
    const lines = file.content.split("\n");
    const targetLine = lines[aiFinding.line - 1];
    
    if (!targetLine) {
      verificationStatus = "false-positive";
      verificationNotes = "Line number does not exist in file";
      confidence = "low";
    } else {
      // Check if evidence matches actual code
      const evidenceNormalized = aiFinding.evidence.trim().replace(/\s+/g, " ");
      const lineNormalized = targetLine.trim().replace(/\s+/g, " ");
      
      if (lineNormalized.includes(evidenceNormalized) || evidenceNormalized.includes(lineNormalized)) {
        sources.push("pattern-match");
        if (verificationStatus === "likely") {
          verificationStatus = "confirmed";
          verificationNotes = "Evidence matches code exactly";
          confidence = "high";
        }
      } else {
        // Evidence doesn't match - might be hallucination
        if (verificationStatus !== "confirmed") {
          verificationStatus = "uncertain";
          verificationNotes = "Evidence does not match actual code at specified line";
          confidence = "low";
        }
      }
    }
  } else {
    verificationStatus = "false-positive";
    verificationNotes = "File not found in codebase";
    confidence = "low";
  }

  // 3. Severity-specific validation
  if (aiFinding.severity === "critical" || aiFinding.severity === "high") {
    // High-severity findings need stronger evidence
    if (sources.length < 2 && verificationStatus !== "confirmed") {
      confidence = confidence === "high" ? "medium" : "low";
      verificationNotes += "; High-severity finding needs stronger evidence";
    }
  }

  // 4. Category-specific validation
  const categoryValidation = validateByCategory(aiFinding, file?.content);
  if (categoryValidation.isFalsePositive) {
    verificationStatus = "false-positive";
    verificationNotes = categoryValidation.reason;
    confidence = "low";
  } else if (categoryValidation.adjustConfidence) {
    confidence = categoryValidation.adjustConfidence;
    verificationNotes += categoryValidation.reason ? `; ${categoryValidation.reason}` : "";
  }

  return {
    ...aiFinding,
    confidence,
    verificationStatus,
    verificationNotes,
    sources,
  };
}

interface CategoryValidation {
  isFalsePositive: boolean;
  adjustConfidence?: "high" | "medium" | "low";
  reason?: string;
}

function validateByCategory(
  finding: AIFinding,
  fileContent?: string
): CategoryValidation {
  if (!fileContent) return { isFalsePositive: false };

  const lines = fileContent.split("\n");
  const contextStart = Math.max(0, finding.line - 5);
  const contextEnd = Math.min(lines.length, finding.line + 5);
  const context = lines.slice(contextStart, contextEnd).join("\n");

  switch (finding.category) {
    case "security":
      // SQL Injection validation
      if (finding.title.toLowerCase().includes("sql injection")) {
        // Check if parameterized queries are used
        if (/\$\d+|\?|:[\w]+/.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses parameterized queries, not vulnerable to SQL injection",
          };
        }
        // Check for ORM usage (Prisma, TypeORM, etc.)
        if (/prisma\.|typeorm\.|sequelize\./i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses ORM with built-in SQL injection protection",
          };
        }
      }

      // XSS validation
      if (finding.title.toLowerCase().includes("xss")) {
        // Check for sanitization
        if (/DOMPurify|sanitize|escape/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Content is sanitized before rendering",
          };
        }
      }

      // Hardcoded secrets validation
      if (finding.title.toLowerCase().includes("hardcoded") || finding.title.toLowerCase().includes("secret")) {
        // Check if it's actually an env variable or placeholder
        if (/process\.env|import\.meta\.env|YOUR_|XXX|PLACEHOLDER|EXAMPLE/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses environment variable or is a placeholder",
          };
        }
      }
      break;

    case "production":
      // Unhandled promise validation
      if (finding.title.toLowerCase().includes("unhandled")) {
        // Check for try-catch or .catch()
        if (/try\s*\{|\.catch\(|\.finally\(/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Error handling is present",
          };
        }
      }
      break;

    case "database":
      // N+1 query validation
      if (finding.title.toLowerCase().includes("n+1") || finding.title.toLowerCase().includes("n-plus-1")) {
        // Check if it's actually a problem (small arrays are fine)
        if (/\.slice\(0,\s*[1-5]\)|\.take\([1-5]\)/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Limited to small number of items, not a performance issue",
          };
        }
      }
      break;

    case "code-quality":
      // Magic number validation
      if (finding.title.toLowerCase().includes("magic number")) {
        // HTTP status codes and common constants are acceptable
        if (/\b(?:200|201|204|400|401|403|404|500|503)\b/.test(finding.evidence)) {
          return {
            isFalsePositive: true,
            reason: "HTTP status code, not a magic number",
          };
        }
      }
      break;

    case "react":
      // Missing key prop validation
      if (finding.title.toLowerCase().includes("key")) {
        // Check if key is actually present nearby
        if (/key\s*=/.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Key prop is present",
          };
        }
      }
      break;
  }

  return { isFalsePositive: false };
}

/**
 * Merge duplicate findings (same issue reported multiple times)
 */
export function deduplicateFindings(findings: VerifiedFinding[]): VerifiedFinding[] {
  const seen = new Map<string, VerifiedFinding>();

  for (const finding of findings) {
    // Create a key based on file, line, and category
    const key = `${finding.file}:${finding.line}:${finding.category}`;
    
    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher confidence
      if (finding.confidence === "high" && existing.confidence !== "high") {
        seen.set(key, finding);
      } else if (finding.verificationStatus === "confirmed" && existing.verificationStatus !== "confirmed") {
        seen.set(key, finding);
      }
      // Merge sources
      existing.sources = [...new Set([...existing.sources, ...finding.sources])];
    } else {
      seen.set(key, finding);
    }
  }

  return Array.from(seen.values());
}

/**
 * Calculate overall confidence score for the entire report
 */
export function calculateReportConfidence(findings: VerifiedFinding[]): {
  score: number;
  grade: string;
  explanation: string;
} {
  if (findings.length === 0) {
    return {
      score: 100,
      grade: "A+",
      explanation: "No findings to verify",
    };
  }

  const confirmedCount = findings.filter(f => f.verificationStatus === "confirmed").length;
  const likelyCount = findings.filter(f => f.verificationStatus === "likely").length;
  const uncertainCount = findings.filter(f => f.verificationStatus === "uncertain").length;

  // Weighted confidence score
  const score = Math.round(
    ((confirmedCount * 1.0 + likelyCount * 0.7 + uncertainCount * 0.3) / findings.length) * 100
  );

  let grade = "F";
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 50) grade = "D";

  const explanation = `${confirmedCount} confirmed, ${likelyCount} likely, ${uncertainCount} uncertain out of ${findings.length} total findings`;

  return { score, grade, explanation };
}
