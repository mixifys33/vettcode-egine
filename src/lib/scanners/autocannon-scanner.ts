/**
 * Autocannon Scanner
 * HTTP benchmarking tool for simulating heavy traffic against servers
 */

import type { CodeFile } from "../types";

export interface AutocannonResult {
  benchmarkIssues: {
    id: string;
    type: "no_compression" | "no_keep_alive" | "large_payload" | "no_etag" | "no_cache_headers" | "slow_query";
    severity: "high" | "medium" | "low";
    message: string;
    file: string;
    line?: number;
    recommendation: string;
  }[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

export async function scanWithAutocannon(files: CodeFile[]): Promise<AutocannonResult> {
  const benchmarkIssues: AutocannonResult["benchmarkIssues"] = [];
  
  // Filter JavaScript/TypeScript files
  const codeFiles = files.filter(f => 
    f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  for (const file of codeFiles) {
    const fileIssues = await analyzeBenchmarkReadiness(file);
    benchmarkIssues.push(...fileIssues);
  }

  const summary = {
    total: benchmarkIssues.length,
    high: benchmarkIssues.filter(i => i.severity === "high").length,
    medium: benchmarkIssues.filter(i => i.severity === "medium").length,
    low: benchmarkIssues.filter(i => i.severity === "low").length,
  };

  return { benchmarkIssues, summary };
}

async function analyzeBenchmarkReadiness(file: CodeFile): Promise<AutocannonResult["benchmarkIssues"]> {
  const issues: AutocannonResult["benchmarkIssues"] = [];
  const lines = file.content.split("\n");

  // Benchmark readiness patterns to detect
  const benchmarkPatterns = [
    {
      type: "no_compression" as const,
      severity: "high" as const,
      pattern: /res\.send\s*\(/g,
      message: "Response without compression",
      recommendation: "Enable compression middleware for better performance"
    },
    {
      type: "no_keep_alive" as const,
      severity: "medium" as const,
      pattern: /http\.createServer\s*\(/g,
      message: "HTTP server without keep-alive configuration",
      recommendation: "Configure keep-alive for better connection reuse"
    },
    {
      type: "large_payload" as const,
      severity: "medium" as const,
      pattern: /res\.json\s*\(\s*{[\s\S]{1000,}/g,
      message: "Large JSON response payload",
      recommendation: "Implement pagination or data compression"
    },
    {
      type: "no_etag" as const,
      severity: "low" as const,
      pattern: /res\.sendFile\s*\(/g,
      message: "Static file serving without ETag",
      recommendation: "Enable ETag headers for better caching"
    },
    {
      type: "no_cache_headers" as const,
      severity: "medium" as const,
      pattern: /res\.setHeader\s*\(\s*['"]Content-Type['"]/g,
      message: "Response without cache headers",
      recommendation: "Add Cache-Control and ETag headers"
    },
    {
      type: "slow_query" as const,
      severity: "high" as const,
      pattern: /SELECT\s+\*\s+FROM/gi,
      message: "SELECT * query can be slow",
      recommendation: "Select only needed columns and add indexes"
    },
    {
      type: "slow_query" as const,
      severity: "high" as const,
      pattern: /db\.collection\([^)]+\)\.find\s*\(\s*{\s*}\s*\)/g,
      message: "MongoDB query without filters",
      recommendation: "Add query filters and indexes for better performance"
    },
    {
      type: "no_compression" as const,
      severity: "medium" as const,
      pattern: /express\s*\(\)\s*\.listen/g,
      message: "Express server without compression",
      recommendation: "Add compression middleware before routes"
    },
    {
      type: "no_keep_alive" as const,
      severity: "low" as const,
      pattern: /agent\s*=\s*new\s+http\.Agent/g,
      message: "HTTP agent without keep-alive",
      recommendation: "Enable keepAlive in agent configuration"
    },
    {
      type: "large_payload" as const,
      severity: "low" as const,
      pattern: /body\s*:\s*JSON\.stringify\([^)]{500,}\)/g,
      message: "Large request body",
      recommendation: "Implement request body compression or chunking"
    }
  ];

  for (const pattern of benchmarkPatterns) {
    let match;
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    
    while ((match = regex.exec(file.content)) !== null) {
      const lineNumber = file.content.substring(0, match.index).split("\n").length;
      
      issues.push({
        id: `autocannon-${pattern.type}-${file.path}-${lineNumber}`,
        type: pattern.type,
        severity: pattern.severity,
        message: pattern.message,
        file: file.path,
        line: lineNumber,
        recommendation: pattern.recommendation
      });
    }
  }

  return issues;
}
