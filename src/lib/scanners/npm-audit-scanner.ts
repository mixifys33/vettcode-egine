/**
 * NPM Audit Scanner
 * Real integration with npm audit to detect security vulnerabilities in dependencies
 */

import type { CodeFile } from "../types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
      // Run npm audit as a child process
      const { stdout, stderr } = await execAsync("npm audit --json", {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const auditResult = JSON.parse(stdout);
      const vulnData = auditResult.vulnerabilities || {};

      // Parse npm audit results
      for (const [pkgName, vulnInfo] of Object.entries(vulnData as any)) {
        const info = vulnInfo as any;
        const severity = getSeverityFromInfo(info);

        vulnerabilities.push({
          id: `npm-audit-${pkgName}`,
          title: `Security vulnerability in ${pkgName}`,
          severity,
          package: pkgName,
          version: info.via?.[0]?.range || "unknown",
          patchedIn: info.fixAvailable?.version || undefined,
          recommendation: info.fixAvailable
            ? `Update to ${info.fixAvailable.version} or later`
            : "No fix available - consider replacing this package",
        });
      }
    } catch (error: any) {
      // npm audit returns exit code 1 if vulnerabilities are found
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          const vulnData = auditResult.vulnerabilities || {};

          for (const [pkgName, vulnInfo] of Object.entries(vulnData as any)) {
            const info = vulnInfo as any;
            const severity = getSeverityFromInfo(info);

            vulnerabilities.push({
              id: `npm-audit-${pkgName}`,
              title: `Security vulnerability in ${pkgName}`,
              severity,
              package: pkgName,
              version: info.via?.[0]?.range || "unknown",
              patchedIn: info.fixAvailable?.version || undefined,
              recommendation: info.fixAvailable
                ? `Update to ${info.fixAvailable.version} or later`
                : "No fix available - consider replacing this package",
            });
          }
        } catch (parseError) {
          console.error(`Failed to parse npm audit output: ${file.path}`, parseError);
        }
      } else {
        console.error(`Failed to run npm audit: ${file.path}`, error.message);
      }
    }
  }

  const summary = {
    total: vulnerabilities.length,
    low: vulnerabilities.filter((v) => v.severity === "low").length,
    moderate: vulnerabilities.filter((v) => v.severity === "moderate").length,
    high: vulnerabilities.filter((v) => v.severity === "high").length,
    critical: vulnerabilities.filter((v) => v.severity === "critical").length,
  };

  return { vulnerabilities, summary };
}

function getSeverityFromInfo(info: any): "low" | "moderate" | "high" | "critical" {
  const severity = info.severity;
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "moderate") return "moderate";
  if (severity === "low") return "low";

  // Fallback: determine from CVSS score if available
  const cvssScore = info.via?.[0]?.source === "npm" ? info.via?.[0]?.cvss?.score : null;
  if (cvssScore) {
    if (cvssScore >= 9.0) return "critical";
    if (cvssScore >= 7.0) return "high";
    if (cvssScore >= 4.0) return "moderate";
    return "low";
  }

  return "moderate"; // Default fallback
}
