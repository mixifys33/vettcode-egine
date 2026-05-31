/**
 * Clinic.js Scanner
 * Performance diagnostics for detecting event loop delays, memory leaks, and other performance bottlenecks
 */

import type { CodeFile } from "../types";

export interface ClinicResult {
  performanceIssues: {
    id: string;
    type: "memory_leak" | "event_loop_lag" | "cpu_usage" | "io_blocking" | "async_waterfall";
    severity: "high" | "medium" | "low";
    message: string;
    file: string;
    line?: number;
    recommendation: string;
  }[];
  summary: {
    total: number;
    memoryLeaks: number;
    eventLoopLag: number;
    cpuUsage: number;
    ioBlocking: number;
    asyncWaterfall: number;
  };
}

export async function scanWithClinic(files: CodeFile[]): Promise<ClinicResult> {
  const performanceIssues: ClinicResult["performanceIssues"] = [];
  
  // Filter JavaScript/TypeScript files
  const codeFiles = files.filter(f => 
    f.path.match(/\.(js|ts|jsx|tsx)$/) && !f.path.includes("node_modules")
  );

  for (const file of codeFiles) {
    const fileIssues = await analyzePerformance(file);
    performanceIssues.push(...fileIssues);
  }

  const summary = {
    total: performanceIssues.length,
    memoryLeaks: performanceIssues.filter(i => i.type === "memory_leak").length,
    eventLoopLag: performanceIssues.filter(i => i.type === "event_loop_lag").length,
    cpuUsage: performanceIssues.filter(i => i.type === "cpu_usage").length,
    ioBlocking: performanceIssues.filter(i => i.type === "io_blocking").length,
    asyncWaterfall: performanceIssues.filter(i => i.type === "async_waterfall").length,
  };

  return { performanceIssues, summary };
}

async function analyzePerformance(file: CodeFile): Promise<ClinicResult["performanceIssues"]> {
  const issues: ClinicResult["performanceIssues"] = [];
  const lines = file.content.split("\n");

  // Performance patterns to detect
  const performancePatterns = [
    {
      type: "memory_leak" as const,
      severity: "high" as const,
      pattern: /setInterval\s*\(/g,
      message: "Potential memory leak: setInterval without clearInterval",
      recommendation: "Ensure clearInterval is called or use a timeout"
    },
    {
      type: "memory_leak" as const,
      severity: "high" as const,
      pattern: /global\.\w+\s*=/g,
      message: "Global variable assignment can cause memory leaks",
      recommendation: "Avoid global variables, use module scope instead"
    },
    {
      type: "event_loop_lag" as const,
      severity: "medium" as const,
      pattern: /while\s*\(\s*true\s*\)/g,
      message: "Infinite loop can block event loop",
      recommendation: "Add break condition or use async/await with delays"
    },
    {
      type: "event_loop_lag" as const,
      severity: "medium" as const,
      pattern: /for\s*\(\s*;\s*;\s*\)/g,
      message: "Infinite for loop can block event loop",
      recommendation: "Add loop condition or break statement"
    },
    {
      type: "cpu_usage" as const,
      severity: "medium" as const,
      pattern: /crypto\.pbkdf2Sync\s*\(/g,
      message: "Synchronous crypto operation blocks event loop",
      recommendation: "Use async version: crypto.pbkdf2"
    },
    {
      type: "cpu_usage" as const,
      severity: "medium" as const,
      pattern: /fs\.readFileSync\s*\(/g,
      message: "Synchronous file read blocks event loop",
      recommendation: "Use async version: fs.readFile"
    },
    {
      type: "cpu_usage" as const,
      severity: "medium" as const,
      pattern: /fs\.writeFileSync\s*\(/g,
      message: "Synchronous file write blocks event loop",
      recommendation: "Use async version: fs.writeFile"
    },
    {
      type: "io_blocking" as const,
      severity: "high" as const,
      pattern: /child_process\.execSync\s*\(/g,
      message: "Synchronous child process execution blocks event loop",
      recommendation: "Use async version: child_process.exec"
    },
    {
      type: "async_waterfall" as const,
      severity: "medium" as const,
      pattern: /\.then\s*\([^)]*\)\s*\.then\s*\([^)]*\)\s*\.then/g,
      message: "Promise chain can be flattened",
      recommendation: "Use async/await for better readability and error handling"
    },
    {
      type: "async_waterfall" as const,
      severity: "low" as const,
      pattern: /callback\s*\([^)]*\)\s*{\s*[^}]*callback/g,
      message: "Nested callbacks can lead to callback hell",
      recommendation: "Use promises or async/await"
    },
    {
      type: "memory_leak" as const,
      severity: "medium" as const,
      pattern: /addEventListener\s*\(/g,
      message: "Event listener without cleanup can cause memory leak",
      recommendation: "Ensure removeEventListener is called when component unmounts"
    },
    {
      type: "cpu_usage" as const,
      severity: "low" as const,
      pattern: /JSON\.parse\s*\(\s*JSON\.stringify/g,
      message: "Deep clone via JSON.parse/stringify is inefficient",
      recommendation: "Use structuredClone or a dedicated deep clone library"
    }
  ];

  for (const pattern of performancePatterns) {
    let match;
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    
    while ((match = regex.exec(file.content)) !== null) {
      const lineNumber = file.content.substring(0, match.index).split("\n").length;
      
      issues.push({
        id: `clinic-${pattern.type}-${file.path}-${lineNumber}`,
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
