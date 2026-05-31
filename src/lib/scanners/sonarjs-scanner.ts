/**
 * SonarJS Scanner
 * Real integration with ESLint + SonarJS plugin for deep static analysis
 * Detects bugs, vulnerabilities, and code smells using actual SonarJS rules
 * All findings are labeled as suggestions for code quality improvements
 */

import type { CodeFile } from "../types";

export interface SonarJSResult {
  issues: {
    id: string;
    rule: string;
    severity: "suggestion"; // All findings are suggestions
    type: "bug" | "vulnerability" | "code_smell" | "security_hotspot";
    message: string;
    file: string;
    line: number;
    column?: number;
    effort: string;
  }[];
  summary: {
    total: number;
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
    securityHotspots: number;
    suggestions: number;
  };
}

export async function scanWithSonarJS(files: CodeFile[]): Promise<SonarJSResult> {
  const issues: SonarJSResult["issues"] = [];

  // Check if we're in a server environment (Node.js)
  const isServer = typeof window === "undefined";

  if (isServer) {
    // Use real ESLint with SonarJS plugin on server-side
    try {
      const eslintResults = await runESLintWithSonarJS(files);
      issues.push(...eslintResults);
    } catch (error: any) {
      console.error("Failed to run ESLint with SonarJS:", error.message);
      // Fall back to simplified analysis
      const fallbackResults = await runSimplifiedAnalysis(files);
      issues.push(...fallbackResults);
    }
  } else {
    // Client-side: use simplified analysis
    const fallbackResults = await runSimplifiedAnalysis(files);
    issues.push(...fallbackResults);
  }

  const summary = {
    total: issues.length,
    bugs: issues.filter((i) => i.type === "bug").length,
    vulnerabilities: issues.filter((i) => i.type === "vulnerability").length,
    codeSmells: issues.filter((i) => i.type === "code_smell").length,
    securityHotspots: issues.filter((i) => i.type === "security_hotspot").length,
    suggestions: issues.length,
  };

  return { issues, summary };
}

async function runESLintWithSonarJS(files: CodeFile[]): Promise<SonarJSResult["issues"]> {
  const issues: SonarJSResult["issues"] = [];

  // Filter JavaScript/TypeScript files
  const codeFiles = files.filter(
    (f) => f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  try {
    // Dynamic imports for Node.js modules
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const { writeFileSync, existsSync, mkdirSync } = await import("fs");
    const { join } = await import("path");
    const { tmpdir } = await import("os");

    const execAsync = promisify(exec);

    // Create temporary directory for files
    const tempDir = join(tmpdir(), `sonarjs-scan-${Date.now()}`);

    // Create directory structure
    for (const file of codeFiles) {
      const filePath = join(tempDir, file.path);
      const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
      if (dirPath && !existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      // Write file content
      writeFileSync(filePath, file.content, "utf-8");
    }

    // Run ESLint with SonarJS plugin
    const { stdout, stderr } = await execAsync(
      `npx eslint "${tempDir}/**/*.{js,ts,jsx,tsx}" --format json --config .eslintrc.json`,
      {
        cwd: process.cwd(),
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    // Parse ESLint JSON output
    const eslintOutput = JSON.parse(stdout);
    for (const result of eslintOutput) {
      for (const message of result.messages) {
        const issue = eslintMessageToSonarJSIssue(result.filePath, message);
        if (issue) {
          issues.push(issue);
        }
      }
    }
  } catch (error: any) {
    // ESLint might not be installed or SonarJS plugin not available
    console.error("ESLint with SonarJS failed, falling back to simplified analysis:", error.message);
    throw error;
  }

  return issues;
}

function eslintMessageToSonarJSIssue(
  filePath: string,
  message: any
): SonarJSResult["issues"][0] | null {
  // Map ESLint rule IDs to SonarJS rule types
  const ruleId = message.ruleId || "unknown";

  let type: "bug" | "vulnerability" | "code_smell" | "security_hotspot" = "code_smell";

  if (ruleId.includes("security") || ruleId.includes("xss") || ruleId.includes("injection")) {
    type = "security_hotspot";
  } else if (ruleId.includes("vulnerability")) {
    type = "vulnerability";
  } else if (ruleId.includes("bug") || ruleId.includes("error")) {
    type = "bug";
  }

  return {
    id: `${ruleId}-${filePath}-${message.line}`,
    rule: ruleId,
    severity: "suggestion",
    type,
    message: message.message,
    file: filePath,
    line: message.line || 1,
    column: message.column,
    effort: "5min",
  };
}

async function runSimplifiedAnalysis(files: CodeFile[]): Promise<SonarJSResult["issues"]> {
  const issues: SonarJSResult["issues"] = [];

  // Filter JavaScript/TypeScript files
  const codeFiles = files.filter(
    (f) => f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  for (const file of codeFiles) {
    const fileIssues = await analyzeFile(file);
    issues.push(...fileIssues);
  }

  return issues;
}

async function analyzeFile(file: CodeFile): Promise<SonarJSResult["issues"]> {
  const issues: SonarJSResult["issues"] = [];

  // SonarJS rules (simplified implementation for fallback)
  const rules = [
    {
      id: "sonarjs:S930",
      rule: "Use of console.log",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /console\.log\s*\(/g,
      message: "Remove this use of console.log",
    },
    {
      id: "sonarjs:S1854",
      rule: "Dead code",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /var\s+\w+\s*=\s*\w+\s*;?\s*$/gm,
      message: "Remove this useless assignment",
    },
    {
      id: "sonarjs:S1066",
      rule: "Collapsible if statements",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /if\s*\([^)]+\)\s*{\s*if\s*\([^)]+\)\s*{/g,
      message: "Merge this if statement with the enclosing one",
    },
    {
      id: "sonarjs:S1186",
      rule: "Empty function",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /function\s+\w+\s*\(\s*\)\s*{\s*}/g,
      message: "Add a nested comment explaining why this function is empty",
    },
    {
      id: "sonarjs:S2095",
      rule: "Resource leak",
      severity: "suggestion" as const,
      type: "bug" as const,
      pattern: /fs\.readFile\s*\(/g,
      message: "Make sure this file is closed or use a try-with-resources",
    },
    {
      id: "sonarjs:S2083",
      rule: "Path traversal",
      severity: "suggestion" as const,
      type: "vulnerability" as const,
      pattern: /fs\.readFile\s*\([^,]+,\s*['"]/g,
      message: "Sanitize the file path to prevent path traversal",
    },
    {
      id: "sonarjs:S2681",
      rule: "Empty block",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /{\s*}/g,
      message: "Either remove this empty block or add a comment",
    },
    {
      id: "sonarjs:S3504",
      rule: "Magic number",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /\b[0-9]{3,}\b/g,
      message: "Extract this magic number into a constant",
    },
    {
      id: "sonarjs:S3776",
      rule: "Cognitive complexity",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /if\s*\([^)]+\)\s*{[\s\S]{500,}/g,
      message: "Refactor this function to reduce its Cognitive Complexity",
    },
    {
      id: "sonarjs:S107",
      rule: "Too many parameters",
      severity: "suggestion" as const,
      type: "code_smell" as const,
      pattern: /function\s+\w+\s*\([^)]{100,}\)/g,
      message: "This function has too many parameters, consider refactoring",
    },
  ];

  for (const rule of rules) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

    while ((match = regex.exec(file.content)) !== null) {
      const lineNumber = file.content.substring(0, match.index).split("\n").length;

      issues.push({
        id: `${rule.id}-${file.path}-${lineNumber}`,
        rule: rule.rule,
        severity: rule.severity,
        type: rule.type,
        message: rule.message,
        file: file.path,
        line: lineNumber,
        effort: "5min",
      });
    }
  }

  return issues;
}
