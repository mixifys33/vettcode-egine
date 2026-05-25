import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, keyForIndex, parseJsonFromModel, getApiKeys } from "@/lib/openrouter";
import type { ExtractedCode } from "@/lib/ast-extractor";
import type { StaticFinding } from "@/lib/static-analyzer";
import type { AIFinding } from "@/lib/verification-layer";

export const maxDuration = 60; // Vercel default for Pro plan
export const dynamic = 'force-dynamic'; // Prevent caching

const SMART_SYSTEM_PROMPT = `You are Vettcode Engine — an expert security auditor.

Analyze the provided code sections and verify static findings.

Focus on:
- Security vulnerabilities (injection, XSS, auth bypass, secrets)
- Production failures (unhandled errors, race conditions, memory leaks)
- Logic errors and data integrity issues

Respond with ONLY valid JSON (no markdown):
{
  "findings": [
    {
      "id": "unique-kebab-id",
      "severity": "critical|high|medium|low|info",
      "category": "security|production|typing|logic|database|performance|reliability|configuration|code-quality|react|other",
      "title": "specific title",
      "description": "detailed explanation",
      "file": "relative/path",
      "line": 0,
      "evidence": "exact code snippet",
      "mitigation": "how to fix",
      "prevention": "how to prevent"
    }
  ]
}

Be strict. Only report real, verifiable issues present in the code.`;

interface SmartBatch {
  sections: ExtractedCode[];
  staticFindings: StaticFinding[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKeys = getApiKeys();
    console.log(`[Smart Batch] API Keys available: ${apiKeys.length}`);
    
    if (apiKeys.length === 0) {
      console.error('[Smart Batch] CRITICAL: No API keys configured!');
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

    console.log(`[Smart Batch ${batchIndex}/${totalBatches}] Processing batch for ${projectName}`);
    console.log(`[Smart Batch ${batchIndex}] Sections: ${batch.sections?.length || 0}, Static findings: ${batch.staticFindings?.length || 0}`);

    if (!batch || (!batch.sections?.length && !batch.staticFindings?.length)) {
      console.warn(`[Smart Batch ${batchIndex}] Empty batch received`);
      return NextResponse.json({ error: "Empty batch" }, { status: 400 });
    }

    const slot = keySlot ?? batchIndex;
    const apiKey = keyForIndex(slot);
    console.log(`[Smart Batch ${batchIndex}] Using API key slot ${slot}`);

    const userPrompt = buildSmartBatchPrompt(projectName, batchIndex, totalBatches, batch);

    console.log(`[Smart Batch ${batchIndex}] Sending request to OpenRouter...`);
    console.log(`[Smart Batch ${batchIndex}] Prompt length: ${userPrompt.length} chars`);

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
      console.log(`[Smart Batch ${batchIndex}] ✓ AI response received from ${model}`);
      console.log(`[Smart Batch ${batchIndex}] Response length: ${content.length} chars`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      console.error(`[Smart Batch ${batchIndex}] ✗ AI request failed:`, message);
      
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

  // Add extracted high-risk code sections (concise format)
  if (batch.sections.length > 0) {
    prompt += `=== CODE SECTIONS ===\n\n`;
    
    for (const extracted of batch.sections) {
      prompt += `FILE: ${extracted.file}\n`;

      for (const section of extracted.sections) {
        prompt += `\n${section.type} ${section.name} (L${section.startLine}-${section.endLine}):\n`;
        prompt += `${section.code}\n`;
      }
    }
  }

  // Add static findings that need verification (concise format)
  if (batch.staticFindings.length > 0) {
    prompt += `\n=== VERIFY THESE ===\n\n`;
    
    for (const finding of batch.staticFindings) {
      prompt += `${finding.file}:${finding.line} - ${finding.title}\n${finding.evidence}\n\n`;
    }
  }

  return prompt;
}
