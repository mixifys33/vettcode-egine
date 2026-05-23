/**
 * Static Analysis - Pattern-based vulnerability detection
 * Runs BEFORE AI to catch obvious issues and reduce token usage
 */

export interface StaticFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  file: string;
  line: number;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

interface Pattern {
  id: string;
  regex: RegExp;
  severity: StaticFinding["severity"];
  category: string;
  title: string;
  description: string;
  confidence: StaticFinding["confidence"];
}

// Security patterns - these catch 80% of common vulnerabilities
const SECURITY_PATTERNS: Pattern[] = [
  // SQL Injection
  {
    id: "sql-injection-string-concat",
    regex: /(?:execute|query|raw)\s*\(\s*[`"'].*?\$\{|(?:execute|query|raw)\s*\(\s*.*?\+\s*.*?\)/gi,
    severity: "critical",
    category: "security",
    title: "Potential SQL Injection via String Concatenation",
    description: "SQL query uses string concatenation/interpolation instead of parameterized queries",
    confidence: "high",
  },
  {
    id: "sql-injection-raw-query",
    regex: /\.raw\s*\(\s*[`"'].*?\$\{/gi,
    severity: "critical",
    category: "security",
    title: "Raw SQL Query with Template Literal",
    description: "Using raw SQL with template literals can lead to SQL injection",
    confidence: "high",
  },

  // XSS
  {
    id: "xss-dangerouslysetinnerhtml",
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{?\s*__html\s*:/gi,
    severity: "high",
    category: "security",
    title: "Potential XSS via dangerouslySetInnerHTML",
    description: "Using dangerouslySetInnerHTML without sanitization can lead to XSS",
    confidence: "medium",
  },
  {
    id: "xss-innerhtml",
    regex: /\.innerHTML\s*=(?!.*DOMPurify)/gi,
    severity: "high",
    category: "security",
    title: "Potential XSS via innerHTML",
    description: "Setting innerHTML without sanitization can lead to XSS attacks",
    confidence: "medium",
  },

  // Secrets in Code
  {
    id: "hardcoded-secret-api-key",
    regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*[`"'](?!process\.env|YOUR_|XXX|sk-or-v1-your)[a-zA-Z0-9_\-]{20,}[`"']/gi,
    severity: "critical",
    category: "security",
    title: "Hardcoded API Key Detected",
    description: "API key is hardcoded in source code instead of using environment variables",
    confidence: "high",
  },
  {
    id: "hardcoded-password",
    regex: /(?:password|passwd|pwd)\s*[=:]\s*[`"'](?!process\.env|YOUR_|\*+|password|admin|test)[^`"'\s]{6,}[`"']/gi,
    severity: "critical",
    category: "security",
    title: "Hardcoded Password Detected",
    description: "Password is hardcoded in source code",
    confidence: "medium",
  },
  {
    id: "hardcoded-jwt-secret",
    regex: /(?:jwt[_-]?secret|secret[_-]?key)\s*[=:]\s*[`"'](?!process\.env|YOUR_)[a-zA-Z0-9_\-]{16,}[`"']/gi,
    severity: "critical",
    category: "security",
    title: "Hardcoded JWT Secret",
    description: "JWT secret is hardcoded instead of using environment variables",
    confidence: "high",
  },

  // Auth Issues
  {
    id: "weak-jwt-algorithm",
    regex: /algorithm\s*:\s*[`"'](?:none|HS256)[`"']/gi,
    severity: "high",
    category: "security",
    title: "Weak JWT Algorithm",
    description: "Using 'none' or weak algorithm for JWT signing",
    confidence: "high",
  },
  {
    id: "missing-auth-check",
    regex: /(?:router\.(?:post|put|delete|patch)|app\.(?:post|put|delete|patch))\s*\([^)]*\)\s*(?:,\s*)?(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{(?![\s\S]{0,200}(?:auth|verify|check|middleware|protect|guard))/gi,
    severity: "high",
    category: "security",
    title: "Potential Missing Authentication Check",
    description: "Mutating endpoint may lack authentication middleware",
    confidence: "low",
  },

  // CORS Issues
  {
    id: "open-cors",
    regex: /Access-Control-Allow-Origin[`"']\s*[,:]?\s*[`"']\*/gi,
    severity: "medium",
    category: "security",
    title: "Open CORS Policy",
    description: "CORS allows all origins (*) which may expose sensitive endpoints",
    confidence: "high",
  },

  // Crypto Issues
  {
    id: "weak-crypto-md5",
    regex: /(?:createHash|crypto\.createHash)\s*\(\s*[`"'](?:md5|sha1)[`"']/gi,
    severity: "medium",
    category: "security",
    title: "Weak Cryptographic Hash",
    description: "Using MD5 or SHA1 which are cryptographically broken",
    confidence: "high",
  },

  // Command Injection
  {
    id: "command-injection-exec",
    regex: /(?:exec|spawn|execSync|spawnSync)\s*\(\s*[`"'].*?\$\{|(?:exec|spawn)\s*\(.*?\+/gi,
    severity: "critical",
    category: "security",
    title: "Potential Command Injection",
    description: "Executing shell commands with user input can lead to command injection",
    confidence: "medium",
  },

  // Path Traversal
  {
    id: "path-traversal",
    regex: /(?:readFile|writeFile|unlink|rmdir|mkdir)\s*\([^)]*(?:\+|`\$\{)(?!.*(?:path\.join|path\.resolve|sanitize))/gi,
    severity: "high",
    category: "security",
    title: "Potential Path Traversal",
    description: "File operations with unsanitized paths can lead to path traversal attacks",
    confidence: "low",
  },

  // Production Issues
  {
    id: "unhandled-promise",
    regex: /(?:async\s+function|async\s*\(|Promise\.(?:all|race))\s*[^{]*\{[^}]*(?:await\s+[^;]+;?)(?![^}]*\.catch\(|[^}]*try\s*\{)/gi,
    severity: "medium",
    category: "production",
    title: "Unhandled Promise Rejection",
    description: "Async operation without error handling can crash the application",
    confidence: "low",
  },
  {
    id: "console-log-production",
    regex: /console\.(?:log|debug|info)\(/gi,
    severity: "low",
    category: "production",
    title: "Console Statement in Production Code",
    description: "Console statements should be removed or replaced with proper logging",
    confidence: "high",
  },
  {
    id: "eval-usage",
    regex: /\beval\s*\(/gi,
    severity: "critical",
    category: "security",
    title: "Use of eval()",
    description: "eval() can execute arbitrary code and is a major security risk",
    confidence: "high",
  },

  // Database Issues
  {
    id: "missing-db-transaction",
    regex: /(?:INSERT|UPDATE|DELETE).*?(?:INSERT|UPDATE|DELETE)(?![\s\S]{0,300}(?:transaction|BEGIN|COMMIT))/gi,
    severity: "medium",
    category: "database",
    title: "Multiple DB Operations Without Transaction",
    description: "Multiple database mutations should be wrapped in a transaction",
    confidence: "low",
  },
  {
    id: "n-plus-one-query",
    regex: /\.map\s*\([^)]*(?:await|\.then)\s*\([^)]*(?:find|query|get)/gi,
    severity: "high",
    category: "performance",
    title: "Potential N+1 Query Problem",
    description: "Querying database inside a loop/map can cause severe performance issues",
    confidence: "medium",
  },
  {
    id: "missing-db-index-hint",
    regex: /WHERE\s+\w+\s*=(?![\s\S]{0,100}INDEX)/gi,
    severity: "low",
    category: "performance",
    title: "Query May Need Index",
    description: "Frequent WHERE clauses should have corresponding database indexes",
    confidence: "low",
  },

  // Code Quality & Best Practices
  {
    id: "magic-numbers",
    regex: /(?:if|while|for|return|===|!==|>|<|>=|<=)\s*\(?[^)]*\b(?!0|1|100|200|201|204|400|401|403|404|500)\d{3,}\b/gi,
    severity: "low",
    category: "code-quality",
    title: "Magic Number Detected",
    description: "Unexplained numeric literals should be named constants",
    confidence: "low",
  },
  {
    id: "long-function",
    regex: /(?:function|=>)\s*[^{]*\{[\s\S]{2000,}?\n\}/gm,
    severity: "low",
    category: "code-quality",
    title: "Function Too Long",
    description: "Function exceeds 100+ lines, consider breaking into smaller functions",
    confidence: "medium",
  },
  {
    id: "deep-nesting",
    regex: /\{\s*\n\s+if\s*\([^)]*\)\s*\{\s*\n\s+if\s*\([^)]*\)\s*\{\s*\n\s+if\s*\([^)]*\)\s*\{/gi,
    severity: "low",
    category: "code-quality",
    title: "Deep Nesting Detected",
    description: "More than 3 levels of nesting makes code hard to read and maintain",
    confidence: "high",
  },
  {
    id: "commented-code",
    regex: /\/\/\s*(?:function|const|let|var|if|for|while|class)\s+\w+/gi,
    severity: "info",
    category: "code-quality",
    title: "Commented-Out Code",
    description: "Commented code should be removed (use version control instead)",
    confidence: "high",
  },
  {
    id: "todo-fixme",
    regex: /\/\/\s*(?:TODO|FIXME|HACK|XXX|BUG):/gi,
    severity: "info",
    category: "code-quality",
    title: "TODO/FIXME Comment",
    description: "Unresolved TODO or FIXME comment indicates incomplete work",
    confidence: "high",
  },
  {
    id: "var-usage",
    regex: /\bvar\s+\w+/g,
    severity: "low",
    category: "code-quality",
    title: "Use of 'var' Instead of 'let'/'const'",
    description: "var has function scope and can cause bugs, use let or const instead",
    confidence: "high",
  },
  {
    id: "any-type-typescript",
    regex: /:\s*any\b/g,
    severity: "low",
    category: "typing",
    title: "TypeScript 'any' Type Usage",
    description: "Using 'any' defeats the purpose of TypeScript, use proper types",
    confidence: "high",
  },
  {
    id: "missing-return-type",
    regex: /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{(?![\s\S]{0,50}:\s*\w+)/gi,
    severity: "low",
    category: "typing",
    title: "Missing Return Type Annotation",
    description: "Functions should have explicit return type annotations in TypeScript",
    confidence: "low",
  },

  // Error Handling
  {
    id: "empty-catch",
    regex: /catch\s*\([^)]*\)\s*\{\s*\}/gi,
    severity: "high",
    category: "production",
    title: "Empty Catch Block",
    description: "Silently swallowing errors makes debugging impossible",
    confidence: "high",
  },
  {
    id: "generic-error-message",
    regex: /throw\s+new\s+Error\s*\(\s*[`"'](?:error|failed|invalid)[`"']\s*\)/gi,
    severity: "low",
    category: "production",
    title: "Generic Error Message",
    description: "Error messages should be specific and actionable",
    confidence: "medium",
  },
  {
    id: "missing-finally",
    regex: /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}(?!\s*finally)/gi,
    severity: "low",
    category: "production",
    title: "Try-Catch Without Finally",
    description: "Consider using finally block for cleanup operations",
    confidence: "low",
  },

  // Async/Await Issues
  {
    id: "floating-promise",
    regex: /^\s*(?!await|return|const|let|var)\w+\([^)]*\)\.then\(/gm,
    severity: "medium",
    category: "production",
    title: "Floating Promise",
    description: "Promise not awaited or assigned, errors will be unhandled",
    confidence: "medium",
  },
  {
    id: "async-without-await",
    regex: /async\s+(?:function|\([^)]*\)\s*=>)\s*[^{]*\{(?![\s\S]*await)[\s\S]{0,500}\}/gi,
    severity: "low",
    category: "code-quality",
    title: "Async Function Without Await",
    description: "Function marked async but doesn't use await",
    confidence: "low",
  },
  {
    id: "promise-constructor-antipattern",
    regex: /new\s+Promise\s*\([^)]*\)\s*\{[\s\S]*?(?:async|await)/gi,
    severity: "medium",
    category: "code-quality",
    title: "Promise Constructor Anti-pattern",
    description: "Wrapping async functions in Promise constructor is redundant",
    confidence: "medium",
  },

  // React-Specific Issues
  {
    id: "missing-key-prop",
    regex: /\.map\s*\([^)]*\)\s*(?:=>)?\s*<(?![\s\S]{0,100}key=)/gi,
    severity: "medium",
    category: "react",
    title: "Missing Key Prop in List",
    description: "React list items should have unique key prop for performance",
    confidence: "medium",
  },
  {
    id: "useeffect-missing-deps",
    regex: /useEffect\s*\([^,]*,\s*\[\s*\]\s*\)/gi,
    severity: "low",
    category: "react",
    title: "useEffect with Empty Dependency Array",
    description: "Empty deps array may indicate missing dependencies",
    confidence: "low",
  },
  {
    id: "inline-function-prop",
    regex: /(?:onClick|onChange|onSubmit|onBlur|onFocus)\s*=\s*\{(?:\([^)]*\)\s*=>|\s*function)/gi,
    severity: "low",
    category: "performance",
    title: "Inline Function in JSX Prop",
    description: "Inline functions cause unnecessary re-renders, define outside render",
    confidence: "low",
  },

  // API & Network Issues
  {
    id: "missing-timeout",
    regex: /(?:fetch|axios|http\.request)\s*\((?![\s\S]{0,200}timeout)/gi,
    severity: "medium",
    category: "production",
    title: "Network Request Without Timeout",
    description: "Network requests should have timeouts to prevent hanging",
    confidence: "medium",
  },
  {
    id: "missing-retry-logic",
    regex: /fetch\s*\([^)]*\)(?![\s\S]{0,300}(?:retry|catch))/gi,
    severity: "low",
    category: "reliability",
    title: "No Retry Logic for Network Request",
    description: "Critical network requests should have retry logic",
    confidence: "low",
  },
  {
    id: "http-not-https",
    regex: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    severity: "medium",
    category: "security",
    title: "HTTP Instead of HTTPS",
    description: "Using HTTP instead of HTTPS exposes data to interception",
    confidence: "high",
  },

  // Environment & Configuration
  {
    id: "missing-env-check",
    regex: /process\.env\.(\w+)(?![\s\S]{0,50}(?:\|\||&&|\?|throw|if))/gi,
    severity: "medium",
    category: "production",
    title: "Environment Variable Without Validation",
    description: "Environment variables should be validated before use",
    confidence: "low",
  },
  {
    id: "debug-mode-production",
    regex: /(?:DEBUG|VERBOSE|LOG_LEVEL)\s*[=:]\s*['"](?:true|debug|verbose|all)['"]/gi,
    severity: "medium",
    category: "configuration",
    title: "Debug Mode Enabled",
    description: "Debug mode should be disabled in production",
    confidence: "medium",
  },

  // Memory & Resource Leaks
  {
    id: "missing-cleanup",
    regex: /(?:setInterval|setTimeout|addEventListener)(?![\s\S]{0,500}(?:clearInterval|clearTimeout|removeEventListener|return\s*\(\s*\)\s*=>))/gi,
    severity: "medium",
    category: "production",
    title: "Potential Memory Leak",
    description: "Timers and event listeners should be cleaned up",
    confidence: "low",
  },
  {
    id: "large-array-operation",
    regex: /\.(?:map|filter|reduce)\s*\([^)]*\)\.(?:map|filter|reduce)\s*\([^)]*\)\.(?:map|filter|reduce)/gi,
    severity: "low",
    category: "performance",
    title: "Chained Array Operations",
    description: "Multiple chained array operations can be optimized into single pass",
    confidence: "medium",
  },

  // Race Conditions
  {
    id: "race-condition-state",
    regex: /setState\s*\([^)]*\)[\s\S]{0,100}setState\s*\(/gi,
    severity: "medium",
    category: "logic",
    title: "Potential Race Condition in State Updates",
    description: "Multiple setState calls can cause race conditions, use functional updates",
    confidence: "low",
  },
];

export function runStaticAnalysis(
  files: Array<{ path: string; content: string }>
): StaticFinding[] {
  const findings: StaticFinding[] = [];
  const seenIds = new Set<string>();

  for (const file of files) {
    // Skip test files and config files for some patterns
    const isTest = /\.(test|spec)\.[jt]sx?$/.test(file.path);
    const isConfig = /\.(config|rc)\.[jt]s$/.test(file.path);

    const lines = file.content.split("\n");

    for (const pattern of SECURITY_PATTERNS) {
      // Skip console.log checks in dev config
      if (pattern.id === "console-log-production" && isConfig) continue;

      const matches = file.content.matchAll(pattern.regex);

      for (const match of matches) {
        if (!match.index) continue;

        // Find line number
        const beforeMatch = file.content.slice(0, match.index);
        const lineNumber = beforeMatch.split("\n").length;

        // Get evidence (the matched line)
        const evidence = lines[lineNumber - 1]?.trim() || match[0];

        // Create unique ID for this specific finding
        const uniqueId = `${pattern.id}-${file.path}-${lineNumber}`;
        if (seenIds.has(uniqueId)) continue;
        seenIds.add(uniqueId);

        findings.push({
          id: uniqueId,
          severity: pattern.severity,
          category: pattern.category,
          title: pattern.title,
          description: pattern.description,
          file: file.path,
          line: lineNumber,
          evidence: evidence.slice(0, 200),
          confidence: pattern.confidence,
        });
      }
    }
  }

  return findings;
}

export function shouldSendToAI(finding: StaticFinding): boolean {
  // Only send low-confidence findings to AI for verification
  // High-confidence findings are already accurate
  return finding.confidence === "low" || finding.confidence === "medium";
}
