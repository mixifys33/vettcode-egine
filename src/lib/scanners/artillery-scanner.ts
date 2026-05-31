/**
 * Artillery Scanner
 * Load testing and stress testing for APIs and web services
 */

import type { CodeFile } from "../types";

export interface ArtilleryResult {
  stressTestIssues: {
    id: string;
    type: "no_rate_limiting" | "no_caching" | "no_compression" | "synchronous_operations" | "no_connection_pooling";
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

export async function scanWithArtillery(files: CodeFile[]): Promise<ArtilleryResult> {
  const stressTestIssues: ArtilleryResult["stressTestIssues"] = [];
  
  // Filter JavaScript/TypeScript files
  const codeFiles = files.filter(f => 
    f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  for (const file of codeFiles) {
    const fileIssues = await analyzeStressResistance(file);
    stressTestIssues.push(...fileIssues);
  }

  const summary = {
    total: stressTestIssues.length,
    high: stressTestIssues.filter(i => i.severity === "high").length,
    medium: stressTestIssues.filter(i => i.severity === "medium").length,
    low: stressTestIssues.filter(i => i.severity === "low").length,
  };

  return { stressTestIssues, summary };
}

async function analyzeStressResistance(file: CodeFile): Promise<ArtilleryResult["stressTestIssues"]> {
  const issues: ArtilleryResult["stressTestIssues"] = [];
  const lines = file.content.split("\n");

  // Stress resistance patterns to detect
  const stressPatterns = [
    {
      type: "no_rate_limiting" as const,
      severity: "high" as const,
      pattern: /app\.(get|post|put|delete)\s*\(/g,
      message: "API endpoint without rate limiting",
      recommendation: "Implement rate limiting middleware (e.g., express-rate-limit)"
    },
    {
      type: "no_caching" as const,
      severity: "medium" as const,
      pattern: /res\.json\s*\(/g,
      message: "API response without caching",
      recommendation: "Implement response caching for frequently accessed endpoints"
    },
    {
      type: "no_compression" as const,
      severity: "medium" as const,
      pattern: /app\.use\s*\(/g,
      message: "Express app without compression middleware",
      recommendation: "Add compression middleware (e.g., compression or express-compression)"
    },
    {
      type: "synchronous_operations" as const,
      severity: "high" as const,
      pattern: /fs\.readFileSync\s*\(/g,
      message: "Synchronous file operations under load",
      recommendation: "Use async file operations to prevent blocking"
    },
    {
      type: "synchronous_operations" as const,
      severity: "high" as const,
      pattern: /fs\.writeFileSync\s*\(/g,
      message: "Synchronous file operations under load",
      recommendation: "Use async file operations to prevent blocking"
    },
    {
      type: "no_connection_pooling" as const,
      severity: "medium" as const,
      pattern: /mysql\.createConnection\s*\(/g,
      message: "Database connection without pooling",
      recommendation: "Use connection pooling (e.g., mysql2/promise with pool)"
    },
    {
      type: "no_connection_pooling" as const,
      severity: "medium" as const,
      pattern: /new\s+MongoClient\s*\(/g,
      message: "MongoDB connection without pooling",
      recommendation: "Configure connection pool settings in MongoClient options"
    },
    {
      type: "no_rate_limiting" as const,
      severity: "high" as const,
      pattern: /router\.(get|post|put|delete)\s*\(/g,
      message: "Router endpoint without rate limiting",
      recommendation: "Implement rate limiting at router level"
    },
    {
      type: "no_caching" as const,
      severity: "low" as const,
      pattern: /SELECT\s+\*\s+FROM/gi,
      message: "Database query without caching",
      recommendation: "Implement query caching for frequently accessed data"
    },
    {
      type: "no_compression" as const,
      severity: "medium" as const,
      pattern: /static\s*\([^)]*\)/g,
      message: "Static file serving without compression",
      recommendation: "Enable compression for static files"
    }
  ];

  for (const pattern of stressPatterns) {
    let match;
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    
    while ((match = regex.exec(file.content)) !== null) {
      const lineNumber = file.content.substring(0, match.index).split("\n").length;
      
      issues.push({
        id: `artillery-${pattern.type}-${file.path}-${lineNumber}`,
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
