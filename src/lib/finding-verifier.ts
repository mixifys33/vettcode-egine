/**
 * Finding Verification Layer
 * Validates AI findings to prevent hallucinations and false positives
 */

import type { StaticFinding } from "./static-analyzer";

export interface VerifiedFinding extends StaticFinding {
  verified: boolean;
  verificationNotes?: string;
  originalConfidence: StaticFinding["confidence"];
  adjustedConfidence: StaticFinding["confidence"];
}

interface VerificationRule {
  findingPattern: RegExp;
  codePattern: RegExp;
  shouldExist: boolean; // true = pattern should exist, false = pattern should NOT exist
  adjustConfidence: (current: StaticFinding["confidence"]) => StaticFinding["confidence"];
  note: string;
}

const VERIFICATION_RULES: VerificationRule[] = [
  // SQL Injection - verify parameterization is missing
  {
    findingPattern: /sql.*injection/i,
    codePattern: /\$\d+|\?|:[\w]+|prepare/i, // Parameterized query indicators
    shouldExist: false, // If these exist, it's likely safe
    adjustConfidence: () => "low",
    note: "Code appears to use parameterized queries",
  },

  // XSS - verify sanitization is missing
  {
    findingPattern: /xss|cross.*site/i,
    codePattern: /DOMPurify|sanitize|escape|xss/i,
    shouldExist: false,
    adjustConfidence: () => "low",
    note: "Sanitization library detected",
  },

  // Auth - verify auth middleware exists
  {
    findingPattern: /missing.*auth/i,
    codePattern: /authenticate|authorize|requireAuth|isAuth|verifyToken|middleware/i,
    shouldExist: true,
    adjustConfidence: () => "low",
    note: "Authentication middleware found",
  },

  // Hardcoded secrets - verify it's not a placeholder
  {
    findingPattern: /hardcoded.*(?:secret|key|password)/i,
    codePattern: /process\.env|YOUR_|XXX|REPLACE|EXAMPLE|TEST|DEMO/i,
    shouldExist: true,
    adjustConfidence: () => "low",
    note: "Appears to be placeholder or env variable",
  },

  // Command injection - verify input sanitization
  {
    findingPattern: /command.*injection/i,
    codePattern: /execFile|spawn.*\[|sanitize|validate|whitelist/i,
    shouldExist: true,
    adjustConfidence: () => "medium",
    note: "Some input validation detected",
  },

  // Unhandled promise - verify error handling exists
  {
    findingPattern: /unhandled.*promise/i,
    codePattern: /\.catch\(|try\s*\{|catch\s*\(/i,
    shouldExist: true,
    adjustConfidence: () => "low",
    note: "Error handling found",
  },
];

export function verifyFinding(
  finding: StaticFinding,
  fullFileContent: string
): VerifiedFinding {
  let verified = true;
  let verificationNotes: string | undefined;
  let adjustedConfidence = finding.confidence;

  // Get context around the finding (±10 lines)
  const lines = fullFileContent.split("\n");
  const contextStart = Math.max(0, finding.line - 10);
  const contextEnd = Math.min(lines.length, finding.line + 10);
  const context = lines.slice(contextStart, contextEnd).join("\n");

  // Apply verification rules
  for (const rule of VERIFICATION_RULES) {
    if (rule.findingPattern.test(finding.title) || rule.findingPattern.test(finding.description)) {
      const patternExists = rule.codePattern.test(context);

      if (rule.shouldExist && patternExists) {
        // Expected pattern found - likely false positive
        verified = false;
        verificationNotes = rule.note;
        adjustedConfidence = rule.adjustConfidence(finding.confidence);
        break;
      } else if (!rule.shouldExist && patternExists) {
        // Pattern that shouldn't exist was found - likely false positive
        verified = false;
        verificationNotes = rule.note;
        adjustedConfidence = rule.adjustConfidence(finding.confidence);
        break;
      }
    }
  }

  // Additional heuristics
  
  // If evidence is very short, it might be incomplete
  if (finding.evidence.length < 20) {
    adjustedConfidence = downgradeConfidence(adjustedConfidence);
    verificationNotes = (verificationNotes || "") + " Evidence snippet is very short.";
  }

  // If it's in a test file, downgrade severity
  if (finding.file.includes(".test.") || finding.file.includes(".spec.")) {
    if (finding.severity === "critical") finding.severity = "high";
    if (finding.severity === "high") finding.severity = "medium";
    verificationNotes = (verificationNotes || "") + " Found in test file.";
  }

  // If it's in a config file and not a secret, downgrade
  if (finding.file.includes(".config.") && !finding.title.toLowerCase().includes("secret")) {
    adjustedConfidence = downgradeConfidence(adjustedConfidence);
  }

  return {
    ...finding,
    verified,
    verificationNotes,
    originalConfidence: finding.confidence,
    adjustedConfidence,
  };
}

function downgradeConfidence(
  confidence: StaticFinding["confidence"]
): StaticFinding["confidence"] {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

export function verifyFindings(
  findings: StaticFinding[],
  fileContents: Map<string, string>
): VerifiedFinding[] {
  return findings.map((finding) => {
    const content = fileContents.get(finding.file) || "";
    return verifyFinding(finding, content);
  });
}

export function filterHighConfidenceFindings(findings: VerifiedFinding[]): VerifiedFinding[] {
  return findings.filter(
    (f) => f.verified && (f.adjustedConfidence === "high" || f.adjustedConfidence === "medium")
  );
}

export function shouldSendToAI(finding: VerifiedFinding): boolean {
  // Send to AI if:
  // 1. Not verified (needs AI to investigate)
  // 2. Low confidence (needs AI to confirm)
  // 3. Critical/High severity but medium confidence (needs deeper analysis)
  return (
    !finding.verified ||
    finding.adjustedConfidence === "low" ||
    (finding.adjustedConfidence === "medium" && 
     (finding.severity === "critical" || finding.severity === "high"))
  );
}
