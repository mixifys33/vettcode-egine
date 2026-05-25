import { NextResponse } from "next/server";
import { chatCompletion, getApiKeys, getModels } from "@/lib/openrouter";

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify OpenRouter AI integration
 * Visit: /api/test-ai
 */
export async function GET() {
  try {
    console.log('[Test AI] Starting OpenRouter connection test...');
    
    // Check API keys
    const keys = getApiKeys();
    console.log(`[Test AI] API Keys found: ${keys.length}`);
    
    if (keys.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No OpenRouter API keys configured",
        details: "Set OPENROUTER_API_KEY_1, _2, _3 or OPENROUTER_API_KEYS in environment variables",
      }, { status: 500 });
    }

    // Check models
    const models = getModels();
    console.log(`[Test AI] Models configured: ${models.join(', ')}`);

    // Test AI call
    console.log('[Test AI] Sending test request to OpenRouter...');
    const result = await chatCompletion([
      {
        role: "system",
        content: "You are a helpful assistant. Respond with valid JSON only.",
      },
      {
        role: "user",
        content: 'Respond with this exact JSON: {"status": "working", "message": "AI is connected"}',
      },
    ]);

    console.log(`[Test AI] ✓ Response received from ${result.model}`);
    console.log(`[Test AI] Content: ${result.content.substring(0, 200)}`);

    return NextResponse.json({
      success: true,
      message: "OpenRouter AI is working correctly",
      details: {
        apiKeysConfigured: keys.length,
        modelsConfigured: models,
        modelUsed: result.model,
        responsePreview: result.content.substring(0, 200),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error('[Test AI] ✗ Test failed:', message);
    
    return NextResponse.json({
      success: false,
      error: "OpenRouter AI test failed",
      details: message,
    }, { status: 500 });
  }
}
