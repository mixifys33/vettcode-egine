/**
 * Control Flow Analyzer
 * Finds unhandled errors, missing validation, race conditions
 */

import type { FindingCategory } from "./types";

export interface ControlFlowFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: FindingCategory;
  title: string;
  description: string;
  file: string;
  line: number;
  evidence: string;
}

/**
 * Analyze control flow for error handling and validation issues
 */
export function analyzeControlFlow(
  files: Array<{ path: string; content: string }>
): ControlFlowFinding[] {
  const findings: ControlFlowFinding[] = [];
  
  console.log('[Control Flow] Starting analysis...');
  
  for (const file of files) {
    findings.push(...findUnhandledAsyncErrors(file.path, file.content));
    findings.push(...findMissingValidation(file.path, file.content));
    findings.push(...findRaceConditions(file.path, file.content));
    findings.push(...findMissingNullChecks(file.path, file.content));
  }
  
  console.log(`[Control Flow] Found ${findings.length} control flow issues`);
  
  return findings;
}

/**
 * Find async functions without error handling
 */
function findUnhandledAsyncErrors(filePath: string, content: string): ControlFlowFinding[] {
  const findings: ControlFlowFinding[] = [];
  const lines = content.split('\n');
  
  // Find async functions
  const asyncFunctions = content.matchAll(/async\s+function\s+(\w+)|const\s+(\w+)\s*=\s*async/gi);
  
  for (const match of asyncFunctions) {
    if (!match.index) continue;
    
    const funcName = match[1] || match[2];
    const lineNumber = content.slice(0, match.index).split('\n').length;
    
    // Get function body (approximate)
    const funcStart = match.index;
    const funcEnd = findFunctionEnd(content, funcStart);
    const funcBody = content.slice(funcStart, funcEnd);
    
    // Check if function has error handling
    const hasTryCatch = /try\s*\{[\s\S]*\}\s*catch/.test(funcBody);
    const hasCatchChain = /\.catch\s*\(/.test(funcBody);
    const throwsError = /throw\s+(?:new\s+)?Error/.test(funcBody);
    
    if (!hasTryCatch && !hasCatchChain && !throwsError) {
      findings.push({
        id: `unhandled-async-${filePath}-${lineNumber}`,
        severity: 'high',
        category: 'production',
        title: 'Async Function Without Error Handling',
        description: `Function '${funcName}' is async but has no error handling`,
        file: filePath,
        line: lineNumber,
        evidence: lines[lineNumber - 1]?.trim() || '',
      });
    }
  }
  
  return findings;
}

/**
 * Find API endpoints without input validation
 */
function findMissingValidation(filePath: string, content: string): ControlFlowFinding[] {
  const findings: ControlFlowFinding[] = [];
  const lines = content.split('\n');
  
  // Find API route handlers
  const routes = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(/gi);
  
  for (const match of routes) {
    if (!match.index) continue;
    
    const method = match[1];
    const lineNumber = content.slice(0, match.index).split('\n').length;
    
    // Get route handler body
    const handlerStart = match.index;
    const handlerEnd = findFunctionEnd(content, handlerStart);
    const handlerBody = content.slice(handlerStart, handlerEnd);
    
    // Check if handler validates input
    const hasValidation = 
      /validate|schema|zod|joi|yup/.test(handlerBody) ||
      /if\s*\(!.*\)/.test(handlerBody) ||
      /throw.*Error/.test(handlerBody);
    
    if (!hasValidation && (method === 'post' || method === 'put' || method === 'patch')) {
      findings.push({
        id: `missing-validation-${filePath}-${lineNumber}`,
        severity: 'high',
        category: 'security',
        title: 'API Endpoint Without Input Validation',
        description: `${method.toUpperCase()} endpoint lacks input validation`,
        file: filePath,
        line: lineNumber,
        evidence: lines[lineNumber - 1]?.trim() || '',
      });
    }
  }
  
  return findings;
}

/**
 * Find potential race conditions
 */
function findRaceConditions(filePath: string, content: string): ControlFlowFinding[] {
  const findings: ControlFlowFinding[] = [];
  const lines = content.split('\n');
  
  // Find concurrent operations without proper synchronization
  const promiseAlls = content.matchAll(/Promise\.all\s*\(/gi);
  
  for (const match of promiseAlls) {
    if (!match.index) continue;
    
    const lineNumber = content.slice(0, match.index).split('\n').length;
    const line = lines[lineNumber - 1] || '';
    
    // Check if Promise.all involves database writes
    if (/(?:update|insert|delete|create|save)/.test(line)) {
      findings.push({
        id: `race-condition-${filePath}-${lineNumber}`,
        severity: 'high',
        category: 'production',
        title: 'Potential Race Condition in Concurrent Writes',
        description: 'Concurrent database writes may cause race conditions',
        file: filePath,
        line: lineNumber,
        evidence: line.trim(),
      });
    }
  }
  
  return findings;
}

/**
 * Find missing null/undefined checks
 */
function findMissingNullChecks(filePath: string, content: string): ControlFlowFinding[] {
  const findings: ControlFlowFinding[] = [];
  const lines = content.split('\n');
  
  // Find property access that might be null/undefined
  const propertyAccess = content.matchAll(/(\w+)\.(\w+)(?!\?\.)/gi);
  
  for (const match of propertyAccess) {
    if (!match.index) continue;
    
    const varName = match[1];
    const lineNumber = content.slice(0, match.index).split('\n').length;
    const line = lines[lineNumber - 1] || '';
    
    // Skip if already using optional chaining
    if (line.includes('?.')) continue;
    
    // Skip if there's a null check before
    const beforeLines = lines.slice(Math.max(0, lineNumber - 5), lineNumber).join('\n');
    if (new RegExp(`if\\s*\\(${varName}\\)|${varName}\\s*&&|${varName}\\s*\\?`).test(beforeLines)) {
      continue;
    }
    
    // Check if variable comes from external source
    if (/req\.|params\.|query\.|body\.|find|get/.test(line)) {
      findings.push({
        id: `missing-null-check-${filePath}-${lineNumber}`,
        severity: 'medium',
        category: 'production',
        title: 'Missing Null/Undefined Check',
        description: `Property access on '${varName}' without null check`,
        file: filePath,
        line: lineNumber,
        evidence: line.trim(),
      });
    }
  }
  
  return findings;
}

/**
 * Helper: Find the end of a function body
 */
function findFunctionEnd(content: string, start: number): number {
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        return i + 1;
      }
    }
  }
  
  return content.length;
}
