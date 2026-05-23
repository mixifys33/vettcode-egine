import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  keyForIndex,
  parseJsonFromModel,
  getApiKeys,
} from "@/lib/openrouter";
import {
  BATCH_SYSTEM_PROMPT,
  buildSmartBatchUserPrompt,
} from "@/lib/prompts";
import type { BatchAnalysisResult } from "@/lib/types";
import type { StaticFinding } from "@/lib/static-analyzer";

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
    const {
      projectName,
      batchIndex,
      totalBatches,
      smartContext,
      staticFindings,
      keySlot,
    } = body as {
      projectName: string;
      batchIndex: number;
      totalBatches: number;
      smartContext: string;
      staticFindings: StaticFinding[];
      keySlot: number;
    };

    if (!smartContext) {
      return NextResponse.json({ error: "No context in batch" }, { status: 400 });
    }

    const apiKey = keyForIndex(keySlot);

    const { content, model } = await chatCompletion(
      [
        { role: "system", content: BATCH_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildSmartBatchUserPrompt(
            projectName ?? "unknown",
            batchIndex ?? 0,
            totalBatches ?? 1,
            smartContext,
            staticFindings || []
          ),
        },
      ],
      apiKey
    );

    const parsed = parseJsonFromModel<BatchAnalysisResult>(content);

    return NextResponse.json({
      ...parsed,
      batchIndex,
      modelUsed: model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Batch scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
