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
  sources: ("static-analysis" | "ai-analysis" | "pattern-match" | "npm-audit" | "snyk" | "sonarjs" | "clinic" | "artillery" | "autocannon")[];
  source?: "static" | "ai" | "verified" | "scanner"; // Track origin for reporting
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
      // Ensure evidence is a string before calling trim()
      const evidenceStr = typeof aiFinding.evidence === 'string' ? aiFinding.evidence : String(aiFinding.evidence || '');
      const evidenceNormalized = evidenceStr.trim().replace(/\s+/g, " ");
      const lineNormalized = targetLine.trim().replace(/\s+/g, " ");
      
      if (evidenceNormalized && (lineNormalized.includes(evidenceNormalized) || evidenceNormalized.includes(lineNormalized))) {
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
    verificationNotes = categoryValidation.reason || "Marked as false positive";
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
    source: sources.includes("static-analysis") ? "verified" as const : "ai" as const, // Tag AI-discovered findings
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
  const fullContext = lines.slice(Math.max(0, finding.line - 20), Math.min(lines.length, finding.line + 20)).join("\n");

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
        // Check for ORM usage (Prisma, TypeORM, Sequelize, Mongoose, etc.)
        if (/prisma\.|typeorm\.|sequelize\.|mongoose\./i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses ORM with built-in SQL injection protection",
          };
        }
        // Check for query builders (Knex, etc.)
        if (/knex\(|\.where\(|\.select\(|\.insert\(/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses query builder with parameterization",
          };
        }
      }

      // XSS validation
      if (finding.title.toLowerCase().includes("xss") || finding.title.toLowerCase().includes("cross-site scripting")) {
        // Check for sanitization
        if (/DOMPurify|sanitize|escape|encodeURIComponent|textContent/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Content is sanitized before rendering",
          };
        }
        // React/Next.js automatically escapes by default
        if (/\{.*\}|dangerouslySetInnerHTML/.test(context)) {
          if (!/dangerouslySetInnerHTML/.test(context)) {
            return {
              isFalsePositive: true,
              reason: "React/Next.js automatically escapes JSX expressions",
            };
          }
        }
      }

      // Hardcoded secrets validation
      if (finding.title.toLowerCase().includes("hardcoded") || finding.title.toLowerCase().includes("secret") || finding.title.toLowerCase().includes("api key")) {
        // Check if it's actually an env variable or placeholder
        if (/process\.env|import\.meta\.env|YOUR_|XXX|PLACEHOLDER|EXAMPLE|TEST_|DEMO_/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Uses environment variable or is a placeholder/example",
          };
        }
        // Check for common test/example patterns
        if (/sk_test_|pk_test_|test-|demo-|example-/i.test(finding.evidence)) {
          return {
            isFalsePositive: true,
            reason: "Test or example key, not production secret",
          };
        }
      }

      // Authentication bypass validation
      if (finding.title.toLowerCase().includes("authentication") && finding.title.toLowerCase().includes("bypass")) {
        // Check if there's actual auth middleware or JWT validation
        if (/authenticateToken|isAuthenticated|requireAuth|protect|verifyToken|jwt\.verify|jsonwebtoken|authHeader|Authorization|Bearer/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Authentication middleware or token validation is present",
          };
        }
      }

      // Missing authentication check validation
      if (finding.title.toLowerCase().includes("missing") && finding.title.toLowerCase().includes("authentication")) {
        // Check if auth is actually implemented
        if (/req\.headers\.get\(['"]authorization['"]\)|authHeader|Bearer|jwt\.verify|verifyToken|requireAuth|isAuthenticated/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Authentication check is present in the code",
          };
        }
        // Check if it's a public endpoint (login, register, health, etc.)
        if (/\/login|\/register|\/signup|\/health|\/ping|\/public|\/webhook/i.test(fileContent)) {
          return {
            isFalsePositive: true,
            reason: "Public endpoint, authentication not required",
          };
        }
      }

      // Rate limiting validation
      if (finding.title.toLowerCase().includes("rate limit")) {
        // Check for rate limiting implementation
        if (/rateLimit|limiter|throttle|maxRequests|keyLock|requestCount|resetAt/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Rate limiting is implemented",
          };
        }
      }

      // API key exposure validation
      if (finding.title.toLowerCase().includes("api key") && finding.title.toLowerCase().includes("exposed")) {
        // Check if it's using environment variables
        if (/process\.env|import\.meta\.env|Deno\.env/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "API keys are loaded from environment variables, not exposed",
          };
        }
      }

      // JSON injection validation
      if (finding.title.toLowerCase().includes("json injection")) {
        // Check for input validation or sanitization
        if (/JSON\.parse\([^)]*\).*try|try.*JSON\.parse|\.replace\(|sanitize|validate|DOMPurify/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "JSON parsing is wrapped in error handling or input is sanitized",
          };
        }
        // Check for malicious pattern detection
        if (/__proto__|constructor.*prototype|<script|javascript:|on\w+=/i.test(fullContext)) {
          return {
            isFalsePositive: false,
            adjustConfidence: "high",
            reason: "Code checks for malicious patterns, but verify completeness",
          };
        }
      }

      // Race condition validation
      if (finding.title.toLowerCase().includes("race condition")) {
        // Check for mutex, locks, or queue implementation
        if (/mutex|lock|queue|await\s+queue|semaphore|Promise\.all\(.*map/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Synchronization mechanism (mutex/lock/queue) is implemented",
          };
        }
      }
      break;

    case "production":
      // Unhandled promise validation
      if (finding.title.toLowerCase().includes("unhandled")) {
        // Check for try-catch or .catch() or finally
        if (/try\s*\{|\.catch\(|\.finally\(|\.then\([^,)]+,/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Error handling is present (try-catch or .catch() or promise rejection handler)",
          };
        }
        // Check if it's wrapped in another async function with error handling
        if (/async\s+function/.test(fullContext) && /try\s*\{/.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Async function with try-catch error handling",
          };
        }
      }

      // Missing validation validation
      if (finding.title.toLowerCase().includes("missing") && finding.title.toLowerCase().includes("validation")) {
        // Check for validation libraries (Zod, Joi, Yup, etc.)
        if (/\.parse\(|\.validate\(|\.schema\(|z\.|Joi\.|yup\./i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Validation is implemented using validation library",
          };
        }
        // Check for manual validation
        if (/if\s*\([^)]*(?:!|typeof|instanceof|Array\.isArray)\s*[^)]*\)\s*\{?\s*(?:throw|return)/i.test(fullContext)) {
          return {
            adjustConfidence: "medium",
            reason: "Manual validation is present, review for completeness",
          };
        }
      }
      break;

    case "database":
      // N+1 query validation
      if (finding.title.toLowerCase().includes("n+1") || finding.title.toLowerCase().includes("n-plus-1")) {
        // Check if it's actually a problem (small arrays are fine)
        if (/\.slice\(0,\s*[1-9]\)|\.take\([1-9]\)|\.limit\([1-9]\)/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Limited to small number of items, not a performance issue",
          };
        }
        // Check for eager loading (Prisma include, TypeORM relations, etc.)
        if (/include\s*:|relations\s*:|populate\(/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Uses eager loading to prevent N+1 queries",
          };
        }
      }

      // Missing index validation
      if (finding.title.toLowerCase().includes("index") || finding.title.toLowerCase().includes("slow query")) {
        // Check if it's a read-only or small table
        if (/\.findMany\(\)\s*\.length\s*<\s*\d+|LIMIT\s+\d+/i.test(context)) {
          return {
            adjustConfidence: "low",
            reason: "Query appears to be limited, may not need index",
          };
        }
      }
      break;

    case "code-quality":
      // AI placeholder code validation
      if (finding.title.toLowerCase().includes("placeholder") || finding.title.toLowerCase().includes("ai-generated")) {
        // Check if the code has actual implementation
        if (/const\s+\w+\s*=\s*await|return\s+\w+|throw\s+new\s+Error|if\s*\(|for\s*\(|while\s*\(/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Code has actual implementation, not a placeholder",
          };
        }
        // Check for TODO or FIXME comments which indicate it's genuinely incomplete
        if (!/TODO|FIXME|PLACEHOLDER|FIX THIS|IMPLEMENT THIS/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "No placeholder markers found, appears to be complete code",
          };
        }
      }

      // Magic number validation
      if (finding.title.toLowerCase().includes("magic number")) {
        // HTTP status codes are acceptable
        if (/\b(?:200|201|204|301|302|304|400|401|403|404|409|422|500|502|503)\b/.test(finding.evidence)) {
          return {
            isFalsePositive: true,
            reason: "HTTP status code, not a magic number",
          };
        }
        // Common constants (0, 1, -1, 100, 1000) are often acceptable
        if (/\b(?:0|1|-1|100|1000)\b/.test(finding.evidence) && !/\*\s*(?:0|1|-1|100|1000)|(?:0|1|-1|100|1000)\s*\*/.test(context)) {
          return {
            adjustConfidence: "low",
            reason: "Common constant, review if it should be extracted",
          };
        }
      }

      // Console.log validation
      if (finding.title.toLowerCase().includes("console") && finding.title.toLowerCase().includes("log")) {
        // Check if it's debug logging wrapped in condition
        if (/if\s*\([^)]*(?:debug|dev|development)[^)]*\)/i.test(fullContext)) {
          return {
            adjustConfidence: "low",
            reason: "Conditional debug logging, may be intentional",
          };
        }
        // Check if it's in a development file
        if (finding.file.includes("dev") || finding.file.includes("test") || finding.file.includes("debug")) {
          return {
            isFalsePositive: true,
            reason: "Development/test file, console.log is acceptable",
          };
        }
      }

      // TODO comments validation
      if (finding.title.toLowerCase().includes("todo")) {
        // TODOs in test files are less critical
        if (finding.file.includes("test") || finding.file.includes("spec") || finding.file.includes("__tests__")) {
          return {
            adjustConfidence: "low",
            reason: "TODO in test file, lower priority",
          };
        }
      }
      break;

    case "react":
      // Missing key prop validation
      if (finding.title.toLowerCase().includes("key")) {
        // Check if key is actually present nearby
        if (/key\s*=/i.test(context)) {
          return {
            isFalsePositive: true,
            reason: "Key prop is present",
          };
        }
        // Check if it's mapping a static array
        if (/\[(["'][^"']+["'],?\s*){1,5}\]\.map/i.test(fullContext)) {
          return {
            adjustConfidence: "low",
            reason: "Static array with few items, key may not be critical",
          };
        }
      }

      // useEffect dependency validation
      if (finding.title.toLowerCase().includes("useeffect") && finding.title.toLowerCase().includes("dependency")) {
        // Check if dependency is explicitly omitted with eslint-disable
        if (/eslint-disable|eslint-disable-next-line/.test(context)) {
          return {
            adjustConfidence: "medium",
            reason: "Dependency intentionally omitted with ESLint disable",
          };
        }
      }
      break;

    case "performance":
      // Large bundle size validation
      if (finding.title.toLowerCase().includes("bundle") || finding.title.toLowerCase().includes("import")) {
        // Check for dynamic imports
        if (/import\(|React\.lazy|next\/dynamic/i.test(fullContext)) {
          return {
            isFalsePositive: true,
            reason: "Uses dynamic imports for code splitting",
          };
        }
      }
      break;

    case "typing":
      // Missing type validation
      if (finding.title.toLowerCase().includes("type") && (finding.title.toLowerCase().includes("missing") || finding.title.toLowerCase().includes("any"))) {
        // Check if it's JavaScript file (types not required)
        if (finding.file.endsWith(".js") || finding.file.endsWith(".jsx")) {
          return {
            isFalsePositive: true,
            reason: "JavaScript file, types not required",
          };
        }
        // Check if any is intentional with comment
        if (/\/\/\s*@ts-ignore|\/\*.*any.*\*\/|eslint-disable/i.test(context)) {
          return {
            adjustConfidence: "medium",
            reason: "Type explicitly ignored or documented",
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
