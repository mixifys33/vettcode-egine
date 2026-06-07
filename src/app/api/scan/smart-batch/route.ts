import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, keyForIndex, parseJsonFromModel, getApiKeys } from "@/lib/openrouter";
import type { ExtractedCode } from "@/lib/ast-extractor";
import type { StaticFinding } from "@/lib/static-analyzer";
import type { AIFinding } from "@/lib/verification-layer";

export const maxDuration = 60; // Vercel default for Pro plan
export const dynamic = 'force-dynamic'; // Prevent caching

const SMART_SYSTEM_PROMPT = `You are Vettcode Engine — an elite security researcher and software architect with deep expertise in finding subtle bugs that automated tools miss.

Your mission: Find REAL issues that matter in production. Think like an attacker and a senior engineer.

ANALYZE FOR:

1. LOGIC BUGS & BUSINESS LOGIC FLAWS
   - Race conditions in concurrent operations
   - Off-by-one errors in loops and boundaries
   - Incorrect state transitions
   - Missing validation of business rules
   - Edge cases that break assumptions
   - Integer overflow/underflow
   - Incorrect error handling that leaks state

2. SECURITY VULNERABILITIES (Beyond Pattern Matching)
   - Authentication bypass through logic flaws
   - Authorization issues (IDOR, privilege escalation)
   - Injection flaws (SQL, NoSQL, Command, LDAP, XPath)
   - Insecure deserialization
   - SSRF and XXE vulnerabilities
   - Timing attacks and side channels
   - Cryptographic misuse (weak keys, bad modes, no IV)
   - Session fixation and hijacking

3. DATA INTEGRITY & CORRUPTION RISKS
   - Missing transaction boundaries
   - Inconsistent state updates
   - Lost updates in concurrent scenarios
   - Incorrect data validation
   - Type confusion bugs
   - Null/undefined handling errors
   - Data races and memory corruption

4. PRODUCTION FAILURE SCENARIOS
   - Unhandled edge cases that crash
   - Resource exhaustion (memory, connections, file handles)
   - Deadlocks and livelocks
   - Cascading failures
   - Missing circuit breakers
   - Improper error propagation
   - Silent failures that corrupt data

5. PERFORMANCE & SCALABILITY KILLERS
   - N+1 queries that will break under load
   - Unbounded loops or recursion
   - Memory leaks from closures or event listeners
   - Blocking operations in async code
   - Missing indexes on hot paths
   - Inefficient algorithms (O(n²) where O(n) exists)

THINK DEEPLY:
- What happens if this runs 1000x concurrently?
- What if the input is malicious?
- What if the database is slow?
- What if this fails halfway through?
- What assumptions can an attacker break?
- What edge cases will users hit?

BE SPECIFIC:
- Explain HOW the vulnerability works
- Show the ATTACK VECTOR or failure scenario
- Provide CONCRETE examples
- Suggest PRECISE fixes

Respond with ONLY valid JSON:
{
  "findings": [
    {
      "id": "unique-kebab-id",
      "severity": "critical|high|medium|low|info",
      "category": "security|production|typing|logic|database|performance|reliability|configuration|code-quality|react|other",
      "title": "Specific, actionable title",
      "description": "Detailed explanation of the issue, why it matters, and how it can be exploited or cause failure",
      "file": "relative/path",
      "line": 0,
      "evidence": "exact code snippet showing the issue",
      "mitigation": "Precise fix with code example if possible",
      "prevention": "How to prevent this class of issues"
    }
  ]
}

CRITICAL: Only report REAL issues you can prove exist. No false positives. Quality over quantity.`;

interface SmartBatch {
  sections: ExtractedCode[];
  staticFindings: StaticFinding[];
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check - require valid authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid authentication" },
        { status: 401 }
      );
    }

    // Validate the token
    const token = authHeader.substring(7).trim();
    if (!token || token.length < 32) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token format" },
        { status: 401 }
      );
    }
    
    // Verify token matches expected format (alphanumeric + hyphens)
    if (!/^[a-zA-Z0-9-_]+$/.test(token)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token characters" },
        { status: 401 }
      );
    }

    const apiKeys = getApiKeys();
    // Don't log sensitive information about API keys
    if (apiKeys.length === 0) {
      console.error('[Smart Batch] CRITICAL: No API keys configured!');
      return NextResponse.json(
        { error: "OpenRouter API keys not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { projectName, batchIndex, totalBatches, batch, keySlot, attempt = 0 } = body as {
      projectName: string;
      batchIndex: number;
      totalBatches: number;
      batch: SmartBatch;
      keySlot?: number;
      attempt?: number;
    };

    // Sanitize project name to prevent prompt injection and log injection
    const sanitizeForPrompt = (input: string): string => {
      return input
        .replace(/[\r\n\t]/g, ' ') // Remove newlines and tabs
        .replace(/[<>'"{}[\]]/g, '') // Remove special characters
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/\\/g, '') // Remove backslashes
        .trim()
        .slice(0, 200); // Limit length
    };
    
    const sanitizedProjectName = sanitizeForPrompt(projectName);
    console.log(`[Smart Batch ${batchIndex}/${totalBatches}] Processing batch for ${sanitizedProjectName} (attempt ${attempt + 1})`);
    console.log(`[Smart Batch ${batchIndex}] Sections: ${batch.sections?.length || 0}, Static findings: ${batch.staticFindings?.length || 0}`);

    if (!batch || (!batch.sections?.length && !batch.staticFindings?.length)) {
      console.warn(`[Smart Batch ${batchIndex}] Empty batch received`);
      return NextResponse.json({ error: "Empty batch" }, { status: 400 });
    }

    const slot = keySlot ?? batchIndex;
    const apiKey = keyForIndex(slot);
    // Don't log API key slot to prevent key enumeration
    
    const userPrompt = buildSmartBatchPrompt(sanitizedProjectName, batchIndex, totalBatches, batch);

    console.log(`[Smart Batch ${batchIndex}] Sending request to OpenRouter...`);
    console.log(`[Smart Batch ${batchIndex}] Prompt length: ${userPrompt.length} chars`);

    let content: string;
    let model: string;
    
    try {
      // Try with retry logic built into chatCompletion (already has 2 retries)
      const result = await chatCompletion(
        [
          { role: "system", content: SMART_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        apiKey,
        2 // 2 retries at OpenRouter level
      );
      content = result.content;
      model = result.model;
      console.log(`[Smart Batch ${batchIndex}] ✓ AI response received from ${model}`);
      console.log(`[Smart Batch ${batchIndex}] Response length: ${content.length} chars`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      console.error(`[Smart Batch ${batchIndex}] ✗ AI request failed:`, message);
      
      // Return empty findings instead of failing - client will retry
      return NextResponse.json({
        findings: [],
        batchIndex,
        modelUsed: "error",
        error: message,
        retryable: true, // Signal that client should retry
      });
    }

    let parsed: { findings: AIFinding[] };
    
    try {
      parsed = parseJsonFromModel<{ findings: AIFinding[] }>(content);
      console.log(`[Smart Batch ${batchIndex}] ✓ Parsed ${parsed.findings?.length || 0} findings from AI response`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON parse failed";
      console.error(`[Smart Batch ${batchIndex}] ✗ JSON parse error:`, message);
      console.error(`[Smart Batch ${batchIndex}] Raw content preview:`, content.substring(0, 500));
      
      // Return empty findings instead of failing
      return NextResponse.json({
        findings: [],
        batchIndex,
        modelUsed: model,
        error: `Parse error: ${message}`,
      });
    }

    // Validate and sanitize findings structure
    const validFindings = (parsed.findings || []).filter(f => 
      f && 
      typeof f.id === 'string' && 
      typeof f.title === 'string' && 
      typeof f.file === 'string'
    ).map(f => ({
      ...f,
      // Ensure evidence is always a string
      evidence: typeof f.evidence === 'string' ? f.evidence : String(f.evidence || ''),
      // Ensure all required string fields are strings
      description: typeof f.description === 'string' ? f.description : String(f.description || ''),
      mitigation: typeof f.mitigation === 'string' ? f.mitigation : String(f.mitigation || ''),
      prevention: typeof f.prevention === 'string' ? f.prevention : String(f.prevention || ''),
    }));

    console.log(`[Smart Batch ${batchIndex}] ✓ Returning ${validFindings.length} valid findings`);

    return NextResponse.json({
      findings: validFindings,
      batchIndex,
      modelUsed: model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Smart batch analysis failed";
    console.error("[Smart Batch] CRITICAL ERROR:", message, e);
    
    // Return empty findings to allow scan to continue
    return NextResponse.json({ 
      findings: [], 
      error: message 
    }, { status: 200 }); // Return 200 to prevent retry loops
  }
}

function buildSmartBatchPrompt(
  projectName: string,
  batchIndex: number,
  totalBatches: number,
  batch: SmartBatch
): string {
  let prompt = `Project: ${projectName} | Batch ${batchIndex + 1}/${totalBatches}\n\n`;

  // Build application context map (lightweight overview)
  const contextMap = buildApplicationContext(batch);
  if (contextMap) {
    prompt += `=== APPLICATION CONTEXT ===\n${contextMap}\n\n`;
  }

  // Add extracted high-risk code sections (detailed analysis)
  if (batch.sections.length > 0) {
    prompt += `=== CODE TO ANALYZE ===\n\n`;
    
    for (const extracted of batch.sections) {
      prompt += `FILE: ${extracted.file}\n`;
      prompt += `SUMMARY: ${extracted.summary}\n\n`;

      for (const section of extracted.sections) {
        prompt += `${section.type} ${section.name} (L${section.startLine}-${section.endLine}):\n`;
        prompt += `RISK: ${section.riskFactors.join(", ")}\n`;
        prompt += `CONTEXT: ${section.context}\n\n`;
        prompt += `${section.code}\n\n`;
      }
    }
  }

  // Add static findings that need verification
  if (batch.staticFindings.length > 0) {
    prompt += `=== VERIFY THESE PATTERNS ===\n\n`;
    
    for (const finding of batch.staticFindings) {
      prompt += `${finding.file}:${finding.line} - ${finding.title}\n`;
      prompt += `${finding.evidence}\n`;
      prompt += `Description: ${finding.description}\n\n`;
    }
  }

  return prompt;
}

/**
 * Build lightweight application context to help AI understand the bigger picture
 * without sending entire codebase
 */
function buildApplicationContext(batch: SmartBatch): string {
  const context: string[] = [];
  
  // Extract imports and dependencies
  const imports = new Set<string>();
  const frameworks = new Set<string>();
  const databases = new Set<string>();
  const apiPatterns = new Set<string>();
  
  for (const section of batch.sections) {
    for (const codeSection of section.sections) {
      const code = codeSection.code;
      
      // Detect frameworks
      if (/from ['"]react['"]|import.*React/.test(code)) frameworks.add('React');
      if (/from ['"]next/.test(code)) frameworks.add('Next.js');
      if (/from ['"]express['"]/.test(code)) frameworks.add('Express');
      if (/from ['"]@nestjs/.test(code)) frameworks.add('NestJS');
      if (/from ['"]fastify['"]/.test(code)) frameworks.add('Fastify');
      
      // Detect databases
      if (/prisma|@prisma/.test(code)) databases.add('Prisma ORM');
      if (/mongoose|mongodb/.test(code)) databases.add('MongoDB');
      if (/pg|postgres/.test(code)) databases.add('PostgreSQL');
      if (/mysql/.test(code)) databases.add('MySQL');
      if (/redis/.test(code)) databases.add('Redis');
      
      // Detect API patterns
      if (/router\.(get|post|put|delete|patch)/.test(code)) apiPatterns.add('REST API');
      if (/GraphQL|graphql|apollo/.test(code)) apiPatterns.add('GraphQL');
      if (/tRPC|trpc/.test(code)) apiPatterns.add('tRPC');
      
      // Extract key imports
      const importMatches = code.matchAll(/from ['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const pkg = match[1];
        if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
          imports.add(pkg.split('/')[0]);
        }
      }
    }
  }
  
  // Build context summary
  if (frameworks.size > 0) {
    context.push(`Frameworks: ${Array.from(frameworks).join(', ')}`);
  }
  if (databases.size > 0) {
    context.push(`Databases: ${Array.from(databases).join(', ')}`);
  }
  if (apiPatterns.size > 0) {
    context.push(`API Style: ${Array.from(apiPatterns).join(', ')}`);
  }
  
  // Add key dependencies (limit to most important)
  const keyDeps = Array.from(imports).filter(pkg => 
    ['axios', 'fetch', 'bcrypt', 'jsonwebtoken', 'passport', 'multer', 'zod', 'joi', 'yup'].includes(pkg)
  );
  if (keyDeps.length > 0) {
    context.push(`Key Dependencies: ${keyDeps.join(', ')}`);
  }
  
  // Extract function signatures from the batch for cross-reference
  const functions = new Set<string>();
  for (const section of batch.sections) {
    for (const codeSection of section.sections) {
      functions.add(`${section.file}::${codeSection.name}`);
    }
  }
  
  if (functions.size > 0) {
    context.push(`\nFunctions in this batch:\n${Array.from(functions).slice(0, 20).join('\n')}`);
  }
  
  return context.length > 0 ? context.join('\n') : '';
}
