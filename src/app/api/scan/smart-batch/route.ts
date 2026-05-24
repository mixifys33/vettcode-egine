import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, keyForIndex, parseJsonFromModel, getApiKeys } from "@/lib/openrouter";
import type { ExtractedCode } from "@/lib/ast-extractor";
import type { StaticFinding } from "@/lib/static-analyzer";
import type { AIFinding } from "@/lib/verification-layer";

export const maxDuration = 60; // Vercel max for Hobby/Pro plan (increased for large codebases)
export const dynamic = 'force-dynamic'; // Prevent caching

const SMART_SYSTEM_PROMPT = `You are Vettcode Engine — an expert security auditor and code quality analyst.

You receive:
1. HIGH-RISK CODE SECTIONS extracted via AST analysis (not full files)
2. LOW-CONFIDENCE findings from static analysis that need your verification

Your job:
- Analyze ONLY the provided code sections for real vulnerabilities and issues
- Verify the static findings: confirm if they're real issues or false positives
- DO NOT invent issues that aren't present in the code
- DO NOT report issues already covered by static analysis unless you have additional context
- Focus on: security vulnerabilities, production failures, logic errors, race conditions, data integrity issues

Be STRICT and HONEST. Only report issues you can prove exist in the provided code.

Respond with ONLY valid JSON (no markdown):
{
  "findings": [
    {
      "id": "unique-kebab-id",
      "severity": "critical|high|medium|low|info",
      "category": "security|production|typing|logic|database|performance|reliability|configuration|code-quality|react|other",
      "title": "specific title",
      "description": "detailed explanation with context",
      "file": "relative/path",
      "line": 0,
      "evidence": "exact code snippet",
      "mitigation": "how to fix immediately",
      "prevention": "how to prevent recurrence"
    }
  ]
}`;

interface SmartBatch {
  sections: ExtractedCode[];
  staticFindings: StaticFinding[];
}

export async function POST(req: NextRequest) {
  try {
    if (getApiKeys().length === 0) {
      return NextResponse.json(
        { error: "OpenRouter API keys not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { projectName, batchIndex, totalBatches, batch, keySlot } = body as {
      projectName: string;
      batchIndex: number;
      totalBatches: number;
      batch: SmartBatch;
      keySlot?: number;
    };

    if (!batch || (!batch.sections?.length && !batch.staticFindings?.length)) {
      return NextResponse.json({ error: "Empty batch" }, { status: 400 });
    }

    const slot = keySlot ?? batchIndex;
    const apiKey = keyForIndex(slot);

    const userPrompt = buildSmartBatchPrompt(projectName, batchIndex, totalBatches, batch);

    let content: string;
    let model: string;
    
    try {
      const result = await chatCompletion(
        [
          { role: "system", content: SMART_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        apiKey
      );
      content = result.content;
      model = result.model;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      console.error(`Batch ${batchIndex} AI error:`, message);
      
      // Return empty findings instead of failing
      return NextResponse.json({
        findings: [],
        batchIndex,
        modelUsed: "error",
        error: message,
      });
    }

    let parsed: { findings: AIFinding[] };
    
    try {
      parsed = parseJsonFromModel<{ findings: AIFinding[] }>(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON parse failed";
      console.error(`Batch ${batchIndex} parse error:`, message);
      console.error('Raw content:', content.substring(0, 500));
      
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

    return NextResponse.json({
      findings: validFindings,
      batchIndex,
      modelUsed: model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Smart batch analysis failed";
    console.error("Smart batch error:", message, e);
    
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
  let prompt = `Project: ${projectName}\nBatch: ${batchIndex + 1} of ${totalBatches}\n\n`;

  // Add extracted high-risk code sections
  if (batch.sections.length > 0) {
    prompt += `=== HIGH-RISK CODE SECTIONS (AST-extracted) ===\n\n`;
    
    for (const extracted of batch.sections) {
      prompt += `FILE: ${extracted.file} (${extracted.language})\n`;
      prompt += `Summary: ${extracted.summary}\n\n`;

      for (const section of extracted.sections) {
        prompt += `--- ${section.type}: ${section.name} (lines ${section.startLine}-${section.endLine}) ---\n`;
        prompt += `Risk factors: ${section.riskFactors.join(", ")}\n`;
        prompt += `Context: ${section.context}\n\n`;
        prompt += `${section.code}\n\n`;
        prompt += `--- END ${section.name} ---\n\n`;
      }
    }
  }

  // Add static findings that need verification
  if (batch.staticFindings.length > 0) {
    prompt += `\n=== STATIC ANALYSIS FINDINGS (verify these) ===\n\n`;
    
    for (const finding of batch.staticFindings) {
      prompt += `${finding.file}:${finding.line} - ${finding.title}\n`;
      prompt += `Severity: ${finding.severity} | Confidence: ${finding.confidence}\n`;
      prompt += `Evidence: ${finding.evidence}\n`;
      prompt += `Description: ${finding.description}\n\n`;
    }

    prompt += `\nFor each static finding above, verify if it's a real issue or false positive. If real, include it in your findings with additional context.\n`;
  }

  prompt += `\nAnalyze the code sections above. Report ONLY real, verifiable issues. Include file path, line number, and exact evidence.`;

  return prompt;
}
