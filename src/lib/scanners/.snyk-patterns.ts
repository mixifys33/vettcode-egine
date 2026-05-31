// Security patterns for Snyk scanner
// This file is excluded from scanning to prevent false positives

export const securityPatterns = [
  {
    pattern: /eval\s*\(/gi,
    title: "Use of eval()",
    severity: "critical" as const,
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
      // Skip if in string literal, comment, evidence description, or pattern definition
      // Also skip if this is the pattern definition itself (self-reference)
      if (content.includes('title: "Use of document.write()"')) {
        return true; // Skip - this is the pattern definition
      }
      return /["'].*document\.write.*["']|\/\*.*document\.write.*\*\/|description:|title:|evidence:|pattern:.*document\.write/.test(content);
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
