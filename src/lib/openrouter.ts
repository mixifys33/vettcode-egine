const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

let keyIndex = 0;

export function getApiKeys(): string[] {
  const keys: string[] = [];
  const combined = process.env.OPENROUTER_API_KEYS;
  if (combined) {
    keys.push(
      ...combined
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`];
    if (k?.trim()) keys.push(k.trim());
  }
  
  // Debug logging (only in development or when keys are missing)
  if (keys.length === 0) {
    console.error('[OpenRouter] No API keys found! Check environment variables.');
    console.error('[OpenRouter] OPENROUTER_API_KEYS:', process.env.OPENROUTER_API_KEYS ? 'SET' : 'NOT SET');
    console.error('[OpenRouter] OPENROUTER_API_KEY_1:', process.env.OPENROUTER_API_KEY_1 ? 'SET' : 'NOT SET');
  } else {
    const nodeEnv = process.env.NODE_ENV?.trim() || 'production';
    if (nodeEnv === 'development') {
      console.log(`[OpenRouter] Found ${keys.length} API key(s)`);
    }
  }
  
  return [...new Set(keys)];
}

export function getModels(): string[] {
  const raw =
    process.env.OPENROUTER_MODELS ??
    "openrouter/free,deepseek/deepseek-chat-v3-0324:free,qwen/qwen-2.5-coder-32b-instruct:free";
  const models = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  
  // OpenRouter allows max 3 models in fallback array
  return models.slice(0, 3);
}

export function nextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No OpenRouter API keys configured. Set OPENROUTER_API_KEY_1, _2, _3 or OPENROUTER_API_KEYS."
    );
  }
  const key = keys[keyIndex % keys.length];
  keyIndex += 1;
  return key;
}

export function keyForIndex(index: number): string {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No OpenRouter API keys configured.");
  return keys[index % keys.length];
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  model: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  keyOverride?: string,
  retries = 2
): Promise<ChatResult> {
  const apiKey = keyOverride ?? nextApiKey();
  const models = getModels();
  
  // Validate and construct site URL
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteUrl = publicUrl || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");

  const body: Record<string, unknown> = {
    models,
    messages,
    temperature: 0.15, // Slightly higher for more nuanced analysis
    max_tokens: 6000, // Increased for detailed findings
  };

  if (models.length === 1) {
    body.model = models[0];
    delete body.models;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const nodeEnv = process.env.NODE_ENV?.trim() || 'production';
      if (nodeEnv === 'development') {
        console.log(`[OpenRouter] Attempt ${attempt + 1}/${retries + 1} - Calling ${OPENROUTER_URL}`);
        console.log(`[OpenRouter] Models: ${JSON.stringify(models)}`);
        console.log(`[OpenRouter] Message count: ${messages.length}, Total chars: ${messages.reduce((sum, m) => sum + m.content.length, 0)}`);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "Vettcode Engine",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (nodeEnv === 'development') {
        console.log(`[OpenRouter] Response status: ${res.status}`);
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[OpenRouter] Error response:`, errText.slice(0, 500));
        
        // Check for rate limit or temporary errors
        if (res.status === 429 || res.status === 503) {
          if (attempt < retries) {
            console.warn(`[OpenRouter] Rate limited or service unavailable, retrying in ${2000 * (attempt + 1)}ms...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }
        }
        
        throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 500)}`);
      }

      const data = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      
      const nodeEnv = process.env.NODE_ENV?.trim() || 'production';
      if (nodeEnv === 'development') {
        console.log(`[OpenRouter] Response model: ${data.model || 'unknown'}`);
        console.log(`[OpenRouter] Content length: ${content?.length || 0} chars`);
      }
      
      if (!content) {
        if (attempt < retries) {
          console.warn(`[OpenRouter] Empty response, retrying (${attempt + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error("Empty response from OpenRouter after retries");
      }

      if (nodeEnv === 'development') {
        console.log(`[OpenRouter] ✓ Success on attempt ${attempt + 1}`);
      }
      return { content, model: data.model ?? models[0] };
    } catch (error) {
      // Log error for debugging
      if (error instanceof Error) {
        console.error(`[OpenRouter] Request error: ${error.message}`);
      }
      
      if (attempt === retries) {
        console.error(`[OpenRouter] ✗ All attempts failed:`, error);
        throw error;
      }
      console.warn(`[OpenRouter] Attempt ${attempt + 1} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error("Failed after all retries");
}

export function parseJsonFromModel<T>(raw: string): T {
  const trimmed = raw.trim();
  
  // Try to extract JSON from markdown code blocks
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  
  // Remove any leading/trailing text that's not JSON
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    // Log initial parse error
    if (error instanceof Error) {
      console.error(`[JSON Parse] Initial parse failed: ${error.message}`);
    }
    
    // Try to fix common JSON issues
    try {
      // Fix unescaped quotes in strings
      const fixed = jsonStr
        .replace(/([^\\])"([^"]*)":/g, '$1\\"$2":') // Fix keys
        .replace(/: "([^"]*)"([^,}\]])/g, ': "$1\\"$2'); // Fix values
      
      return JSON.parse(fixed) as T;
    } catch (fixError) {
      console.error('[JSON Parse] Failed to parse JSON:', jsonStr.substring(0, 500));
      console.error('[JSON Parse] Fix attempt also failed:', fixError);
      throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }
}
