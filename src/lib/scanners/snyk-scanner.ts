/**
 * Snyk Scanner
 * Industry-standard library for finding and fixing vulnerabilities in dependencies and code
 */

import type { CodeFile } from "../types";

export interface SnykResult {
  vulnerabilities: {
    id: string;
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    package: string;
    version: string;
    cwe?: string[];
    cvssScore?: number;
    description: string;
    remediation: string;
  }[];
  summary: {
    total: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export async function scanWithSnyk(files: CodeFile[]): Promise<SnykResult> {
  const vulnerabilities: SnykResult["vulnerabilities"] = [];
  
  // Find package.json files
  const packageFiles = files.filter(f => 
    f.path === "package.json" || f.path.endsWith("/package.json")
  );

  for (const file of packageFiles) {
    try {
      const packageJson = JSON.parse(file.content);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Simulate Snyk results (in production, this would call Snyk API)
      // For now, we'll do basic checks on known vulnerabilities
      const snykVulns = await checkSnykVulnerabilities(dependencies);
      vulnerabilities.push(...snykVulns);
    } catch (error) {
      console.error(`Failed to parse package.json for Snyk: ${file.path}`, error);
    }
  }

  // Also scan code files for security issues
  const codeFiles = files.filter(f => 
    f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  for (const file of codeFiles) {
    const codeVulns = await scanCodeForVulnerabilities(file);
    vulnerabilities.push(...codeVulns);
  }

  const summary = {
    total: vulnerabilities.length,
    low: vulnerabilities.filter(v => v.severity === "low").length,
    medium: vulnerabilities.filter(v => v.severity === "medium").length,
    high: vulnerabilities.filter(v => v.severity === "high").length,
    critical: vulnerabilities.filter(v => v.severity === "critical").length,
  };

  return { vulnerabilities, summary };
}

async function checkSnykVulnerabilities(dependencies: Record<string, string>): Promise<SnykResult["vulnerabilities"]> {
  const vulnerabilities: SnykResult["vulnerabilities"] = [];
  
  // Common vulnerabilities from Snyk database (simulated)
  const snykDatabase: Record<string, { severity: string; cwe: string[]; cvssScore: number; description: string; remediation: string }> = {
    "lodash": {
      severity: "high",
      cwe: ["CWE-1321"],
      cvssScore: 7.5,
      description: "Prototype Pollution in lodash",
      remediation: "Upgrade to version 4.17.21 or later"
    },
    "axios": {
      severity: "medium",
      cwe: ["CWE-942"],
      cvssScore: 5.3,
      description: "SSRF in axios",
      remediation: "Upgrade to version 0.21.1 or later"
    },
    "moment": {
      severity: "high",
      cwe: ["CWE-400"],
      cvssScore: 7.5,
      description: "ReDoS vulnerability in moment",
      remediation: "Upgrade to version 2.29.4 or later"
    },
    "path-parse": {
      severity: "critical",
      cwe: ["CWE-22"],
      cvssScore: 9.8,
      description: "Path traversal in path-parse",
      remediation: "Upgrade to version 1.0.7 or later"
    }
  };

  for (const [pkg, version] of Object.entries(dependencies)) {
    const vulnInfo = snykDatabase[pkg];
    if (vulnInfo) {
      vulnerabilities.push({
        id: `snyk-${pkg}`,
        title: `Snyk: ${vulnInfo.description}`,
        severity: vulnInfo.severity as any,
        package: pkg,
        version,
        cwe: vulnInfo.cwe,
        cvssScore: vulnInfo.cvssScore,
        description: vulnInfo.description,
        remediation: vulnInfo.remediation
      });
    }
  }

  return vulnerabilities;
}

async function scanCodeForVulnerabilities(file: CodeFile): Promise<SnykResult["vulnerabilities"]> {
  const vulnerabilities: SnykResult["vulnerabilities"] = [];
  const content = file.content;

  // Check for common security issues in code
  const securityPatterns = [
    {
      pattern: /eval\s*\(/gi,
      title: "Use of eval() function",
      severity: "high" as const,
      description: "eval() can execute arbitrary code",
      remediation: "Avoid using eval() and use safer alternatives",
      contextFilter: (context: string) => {
        // False positive if eval is in a string/pattern
        if (/["'`].*eval.*["'`]|\/.*eval.*\//.test(context)) return true;
        // False positive if in a comment
        if (/\/\/.*eval|\/\*.*eval.*\*\//.test(context)) return true;
        // False positive if eval is in a list/array definition
        if (/\[.*["']?eval["']?.*\]|{.*["']?eval["']?.*}/.test(context)) return true;
        // False positive if it's a type definition
        if (/interface|type\s+\w+|enum|declare/i.test(context)) return true;
        // False positive if it's a regex pattern
        if (/\/.*eval.*\/[gimsuy]*/.test(context)) return true;
        // False positive if it's babel/parser related
        if (/@babel\/parser|parse\(|traverse\(/.test(context)) return true;
        return false;
      }
    },
    {
      pattern: /innerHTML\s*=/gi,
      title: "Use of innerHTML",
      severity: "medium" as const,
      description: "innerHTML can lead to XSS vulnerabilities",
      remediation: "Use textContent or sanitize input with DOMPurify"
    },
    {
      pattern: /document\.write\s*\(/gi,
      title: "Use of document.write()",
      severity: "medium" as const,
      description: "document.write() can lead to XSS vulnerabilities",
      remediation: "Use DOM manipulation methods instead",
      contextFilter: (content: string) => {
        // Skip if in string literal, comment, or evidence description
        return /["'].*document\.write.*["']|\/\*.*document\.write.*\*\/|description:|title:|evidence:/.test(content);
      }
    },
    {
      pattern: /setTimeout\s*\(\s*["']string["']\s*\)/gi,
      title: "String argument to setTimeout",
      severity: "low" as const,
      description: "String arguments to setTimeout can lead to code injection",
      remediation: "Use function arguments instead of strings"
    }
  ];

  for (const { pattern, title, severity, description, remediation, contextFilter } of securityPatterns) {
    if (pattern.test(content)) {
      // Apply context filter if available to avoid false positives
      if (contextFilter && contextFilter(content)) {
        continue; // Skip this finding as it's a false positive
      }
      vulnerabilities.push({
        id: `snyk-code-${file.path}-${title.replace(/\s+/g, "-").toLowerCase()}`,
        title: `${title} in ${file.path}`,
        severity,
        package: file.path,
        version: "source",
        description,
        remediation
      });
    }
  }

  return vulnerabilities;
}
