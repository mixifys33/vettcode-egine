import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  getApiKeys,
  parseJsonFromModel,
} from "@/lib/openrouter";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
} from "@/lib/prompts";
import type { BatchAnalysisResult, VettReport } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (getApiKeys().length === 0) {
      return NextResponse.json(
        { error: "OpenRouter API keys not configured on server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { projectName, stats, batchResults } = body as {
      projectName: string;
      stats: { files: number; lines: number; ignored: number };
      batchResults: BatchAnalysisResult[];
    };

    const { content, model } = await chatCompletion([
      { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSynthesisUserPrompt(
          projectName ?? "project",
          stats,
          JSON.stringify(batchResults, null, 2)
        ),
      },
    ]);

    const report = parseJsonFromModel<VettReport>(content);

    return NextResponse.json({
      ...report,
      scannedFiles: stats.files,
      scannedLines: stats.lines,
      ignoredPaths: stats.ignored,
      modelUsed: model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Synthesis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
