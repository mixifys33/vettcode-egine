/**
 * NPM Audit Scanner
 * Scans package.json for known security vulnerabilities in dependencies
 */

import type { CodeFile } from "../types";

export interface NpmAuditResult {
  vulnerabilities: {
    id: string;
    title: string;
    severity: "low" | "moderate" | "high" | "critical";
    package: string;
    version: string;
    patchedIn?: string;
    recommendation: string;
  }[];
  summary: {
    total: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
}

export async function scanWithNpmAudit(files: CodeFile[]): Promise<NpmAuditResult> {
  const vulnerabilities: NpmAuditResult["vulnerabilities"] = [];
  
  // Find package.json files
  const packageFiles = files.filter(f => 
    f.path === "package.json" || f.path.endsWith("/package.json")
  );

  for (const file of packageFiles) {
    try {
      const packageJson = JSON.parse(file.content);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      // Simulate npm audit results (in production, this would call npm audit API)
      // For now, we'll do basic checks on known vulnerable packages
      const knownVulns = await checkKnownVulnerabilities(dependencies);
      vulnerabilities.push(...knownVulns);
    } catch (error) {
      console.error(`Failed to parse package.json: ${file.path}`, error);
    }
  }

  const summary = {
    total: vulnerabilities.length,
    low: vulnerabilities.filter(v => v.severity === "low").length,
    moderate: vulnerabilities.filter(v => v.severity === "moderate").length,
    high: vulnerabilities.filter(v => v.severity === "high").length,
    critical: vulnerabilities.filter(v => v.severity === "critical").length,
  };

  return { vulnerabilities, summary };
}

async function checkKnownVulnerabilities(dependencies: Record<string, string>): Promise<NpmAuditResult["vulnerabilities"]> {
  const vulnerabilities: NpmAuditResult["vulnerabilities"] = [];
  
  // Common vulnerable packages (this would be replaced with actual npm audit API in production)
  const knownVulnerablePackages: Record<string, { severity: string; patchedIn: string; recommendation: string }> = {
    "lodash": {
      severity: "high",
      patchedIn: ">=4.17.21",
      recommendation: "Update to latest version"
    },
    "axios": {
      severity: "moderate",
      patchedIn: ">=0.21.1",
      recommendation: "Update to latest version"
    },
    "express": {
      severity: "high",
      patchedIn: ">=4.18.2",
      recommendation: "Update to latest version"
    },
    "react": {
      severity: "moderate",
      patchedIn: ">=18.2.0",
      recommendation: "Update to latest version"
    }
  };

  for (const [pkg, version] of Object.entries(dependencies)) {
    const vulnInfo = knownVulnerablePackages[pkg];
    if (vulnInfo) {
      vulnerabilities.push({
        id: `npm-audit-${pkg}`,
        title: `Known vulnerability in ${pkg}`,
        severity: vulnInfo.severity as any,
        package: pkg,
        version,
        patchedIn: vulnInfo.patchedIn,
        recommendation: vulnInfo.recommendation
      });
    }
  }

  return vulnerabilities;
}
