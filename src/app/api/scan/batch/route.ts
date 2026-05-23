import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  keyForIndex,
  parseJsonFromModel,
  getApiKeys,
} from "@/lib/openrouter";
import {
  BATCH_SYSTEM_PROMPT,
  buildBatchUserPrompt,
} from "@/lib/prompts";
import type { BatchAnalysisResult, CodeFile } from "@/lib/types";

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
      files,
      keySlot,
    } = body as {
      projectName: string;
      batchIndex: number;
      totalBatches: number;
      files: CodeFile[];
      keySlot?: number;
    };

    if (!files?.length) {
      return NextResponse.json({ error: "No files in batch" }, { status: 400 });
    }

    const slot = keySlot ?? batchIndex;
    const apiKey = keyForIndex(slot);

    const { content, model } = await chatCompletion(
      [
        { role: "system", content: BATCH_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildBatchUserPrompt(
            projectName ?? "unknown",
            batchIndex ?? 0,
            totalBatches ?? 1,
            files
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
