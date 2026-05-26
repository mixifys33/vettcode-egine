/**
 * Data Flow Analyzer
 * Tracks user input from sources to dangerous sinks
 * Detects injection vulnerabilities without AI
 */

import type { FindingCategory } from "./types";

export interface DataFlowFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: FindingCategory;
  title: string;
  description: string;
  file: string;
  line: number;
  evidence: string;
  dataFlow: {
    source: string;
    sourceLine: number;
    sink: string;
    sinkLine: number;
    sanitized: boolean;
    path: string[];
  };
}

// User input sources (tainted data)
const INPUT_SOURCES = [
  /req\.body/gi,
  /req\.query/gi,
  /req\.params/gi,
  /req\.headers/gi,
  /req\.cookies/gi,
  /searchParams\.get/gi,
  /formData\.get/gi,
  /process\.env/gi, // Can be tainted in some contexts
];

// Dangerous sinks (where tainted data causes vulnerabilities)
const DANGEROUS_SINKS = {
  sql: [
    /\.execute\s*\(/gi,
    /\.query\s*\(/gi,
    /\.raw\s*\(/gi,
    /sql`/gi,
  ],
  command: [
    /exec\s*\(/gi,
    /execSync\s*\(/gi,
    /spawn\s*\(/gi,
    /spawnSync\s*\(/gi,
    /eval\s*\(/gi,
  ],
  path: [
    /fs\.readFile/gi,
    /fs\.writeFile/gi,
    /fs\.unlink/gi,
    /fs\.rm/gi,
    /require\s*\(/gi,
    /import\s*\(/gi,
  ],
  xss: [
    /\.innerHTML\s*=/gi,
    /\.outerHTML\s*=/gi,
    /document\.write/gi,
    /dangerouslySetInnerHTML/gi,
  ],
};

// Sanitization functions (clean tainted data)
const SANITIZERS = [
  /DOMPurify\.sanitize/gi,
  /escape/gi,
  /sanitize/gi,
  /validate/gi,
  /parseInt/gi,
  /parseFloat/gi,
  /Number\(/gi,
  /\.trim\(\)/gi,
  /\.replace\(/gi,
];

/**
 * Analyze data flow from user inputs to dangerous sinks
 */
export function analyzeDataFlow(
  files: Array<{ path: string; content: string }>
): DataFlowFinding[] {
  const findings: DataFlowFinding[] = [];
  
  console.log('[Data Flow] Starting analysis...');
  
  for (const file of files) {
    const fileFindings = analyzeFileDataFlow(file.path, file.content);
    findings.push(...fileFindings);
  }
  
  console.log(`[Data Flow] Found ${findings.length} data flow vulnerabilities`);
  
  return findings;
}

function analyzeFileDataFlow(filePath: string, content: string): DataFlowFinding[] {
  const findings: DataFlowFinding[] = [];
  const lines = content.split('\n');
  
  // Find all user input sources
  const sources = findInputSources(content, lines);
  
  // Find all dangerous sinks
  const sinks = findDangerousSinks(content, lines);
  
  // Trace data flow from sources to sinks
  for (const source of sources) {
    for (const sink of sinks) {
      // Check if data flows from source to sink
      if (dataFlowsFromTo(source, sink, content, lines)) {
        // Check if data is sanitized
        const sanitized = isSanitizedBetween(source, sink, content);
        
        if (!sanitized) {
          findings.push({
            id: `dataflow-${source.type}-${sink.type}-${filePath}-${sink.line}`,
            severity: getSeverity(sink.type),
            category: getCategory(sink.type),
            title: `${sink.type.toUpperCase()} Injection via Data Flow`,
            description: `User input from ${source.name} flows to ${sink.name} without sanitization`,
            file: filePath,
            line: sink.line,
            evidence: lines[sink.line - 1]?.trim() || '',
            dataFlow: {
              source: source.name,
              sourceLine: source.line,
              sink: sink.name,
              sinkLine: sink.line,
              sanitized: false,
              path: [source.name, sink.name],
            },
          });
        }
      }
    }
  }
  
  return findings;
}

function findInputSources(content: string, lines: string[]): Array<{
  name: string;
  line: number;
  type: 'user-input';
  variable?: string;
}> {
  const sources: Array<{ name: string; line: number; type: 'user-input'; variable?: string }> = [];
  
  for (const pattern of INPUT_SOURCES) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (!match.index) continue;
      
      const beforeMatch = content.slice(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      // Try to extract variable name
      const line = lines[lineNumber - 1] || '';
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
      
      sources.push({
        name: match[0],
        line: lineNumber,
        type: 'user-input',
        variable: varMatch?.[1],
      });
    }
  }
  
  return sources;
}

function findDangerousSinks(content: string, lines: string[]): Array<{
  name: string;
  line: number;
  type: 'sql' | 'command' | 'path' | 'xss';
}> {
  const sinks: Array<{ name: string; line: number; type: 'sql' | 'command' | 'path' | 'xss' }> = [];
  
  for (const [type, patterns] of Object.entries(DANGEROUS_SINKS)) {
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (!match.index) continue;
        
        const beforeMatch = content.slice(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        sinks.push({
          name: match[0],
          line: lineNumber,
          type: type as 'sql' | 'command' | 'path' | 'xss',
        });
      }
    }
  }
  
  return sinks;
}

function dataFlowsFromTo(
  source: { line: number; variable?: string },
  sink: { line: number },
  content: string,
  lines: string[]
): boolean {
  // Source must come before sink
  if (source.line >= sink.line) return false;
  
  // If we have a variable name, check if it's used in the sink line
  if (source.variable) {
    const sinkLine = lines[sink.line - 1] || '';
    if (sinkLine.includes(source.variable)) {
      return true;
    }
  }
  
  // Check if req.body/query/params is used directly in sink
  const sinkLine = lines[sink.line - 1] || '';
  if (/req\.(body|query|params|headers|cookies)/.test(sinkLine)) {
    return true;
  }
  
  return false;
}

function isSanitizedBetween(
  source: { line: number },
  sink: { line: number },
  content: string
): boolean {
  const lines = content.split('\n');
  const betweenLines = lines.slice(source.line, sink.line).join('\n');
  
  // Check if any sanitization function is called
  for (const sanitizer of SANITIZERS) {
    if (sanitizer.test(betweenLines)) {
      return true;
    }
  }
  
  return false;
}

function getSeverity(sinkType: string): "critical" | "high" | "medium" | "low" {
  switch (sinkType) {
    case 'sql':
    case 'command':
      return 'critical';
    case 'path':
    case 'xss':
      return 'high';
    default:
      return 'medium';
  }
}

function getCategory(sinkType: string): FindingCategory {
  return 'security';
}
